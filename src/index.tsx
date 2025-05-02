import {
  NativeModules,
  Platform,
  AppState,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import React, { Component } from 'react';
// NetInfo should be imported from its own package

// Type definition for React Native's ErrorUtils
// We use a conditional check at runtime instead of relying on TypeScript types
type ErrorHandler = (error: Error, isFatal?: boolean) => void;
interface ErrorUtilsInterface {
  getGlobalHandler(): ErrorHandler;
  setGlobalHandler(callback: ErrorHandler): void;
}

// Add safer type compatibility for global.ErrorUtils
declare global {
  interface Global {
    ErrorUtils?: ErrorUtilsInterface;
  }
}

const LINKING_ERROR =
  `The package '@instalog.dev/react-native' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const InstalogRN = NativeModules.InstalogRN
  ? NativeModules.InstalogRN
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export interface InstalogOptions {
  isCrashEnabled?: boolean;
  isFeedbackEnabled?: boolean;
  isLogEnabled?: boolean;
  isLoggerEnabled?: boolean;
  /**
   * Automatically capture and report unhandled JavaScript errors.
   * Default: true
   */
  autoCaptureCrashes?: boolean;
  /**
   * Configuration for error grouping behavior
   */
  errorGrouping?: {
    /** Whether to enable error grouping. Default: true */
    enabled?: boolean;
    /** Interval in milliseconds between error group flush checks. Default: 30000 (30s) */
    flushIntervalMs?: number;
    /** Number of occurrences before sending a group report. Default: 5 */
    errorThreshold?: number;
    /** Maximum age in milliseconds before sending a group report. Default: 60000 (1min) */
    timeWindowMs?: number;
    /** Whether to flush errors when app goes to background. Default: true */
    flushOnBackground?: boolean;
    /** Whether to check network status before sending reports. Default: true */
    requireNetwork?: boolean;
    /** Maximum number of errors to store per group. Default: 10 */
    maxErrorsPerGroup?: number;
    /** Whether to enable dynamic flush intervals based on error frequency. Default: true */
    dynamicFlushInterval?: boolean;
  };
}

// Types for the ErrorBoundary component
export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export interface InstalogInterface {
  initialize(apiKey: string, options?: InstalogOptions): Promise<void>;
  log(event: string, properties?: Record<string, any>): Promise<void>;
  identifyUser(userId: string): Promise<void>;
  simulateCrash(): Promise<void>;
  sendCrash(name: string, report: string): Promise<boolean>;
  showFeedbackModal(): Promise<void>;
  /**
   * Captures React component errors within an ErrorBoundary.
   * Should be used as a wrapper for your React components.
   */
  ErrorBoundary: React.ComponentClass<ErrorBoundaryProps>;
  /**
   * Formats an error into a structured report for sending.
   */
  formatErrorReport(error: Error, errorInfo?: any): string;
}

/**
 * Formats an error into a structured report for sending.
 */
export const formatErrorReport = (error: Error, errorInfo?: any): string => {
  const stack = error.stack || '';
  const componentStack = errorInfo?.componentStack || '';

  return JSON.stringify(
    {
      name: error.name || 'Unknown Error',
      message: error.message || 'No message',
      stack,
      componentStack,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      platformVersion: Platform.Version,
    },
    null,
    2
  );
};

/**
 * React Error Boundary component for capturing and reporting React component errors.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // We need to use the exported Instalog object, but there's a circular reference issue.
    // We know the sendCrash method will be available at runtime, so we call it directly.
    Instalog.sendCrash(
      error.name || 'React Component Error',
      formatErrorReport(error, errorInfo)
    ).catch(console.error);

    console.error('React component error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>{this.state.error?.message}</Text>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={this.resetError}
            >
              <Text style={styles.resetButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )
      );
    }
    return this.props.children;
  }
}

/**
 * Sets up a global error handler to catch and report unhandled JS errors.
 */
const setupGlobalErrorHandler = (options?: InstalogOptions): void => {
  // Safely access ErrorUtils using type assertion
  const errorUtils = (global as any).ErrorUtils;

  // Make sure ErrorUtils is available (it should be in React Native)
  if (errorUtils) {
    const originalHandler = errorUtils.getGlobalHandler();

    // Get error grouping configuration with defaults
    const errorGroupingConfig = {
      enabled: true,
      flushIntervalMs: 30000, // 30 seconds
      errorThreshold: 5,
      timeWindowMs: 60000, // 1 minute
      flushOnBackground: true,
      requireNetwork: true,
      maxErrorsPerGroup: 10,
      dynamicFlushInterval: true,
      ...options?.errorGrouping,
    };

    // If error grouping is disabled, just set up a simple error handler
    if (errorGroupingConfig.enabled === false) {
      errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        const errorName = isFatal
          ? 'Fatal JavaScript Error'
          : 'Non-Fatal JavaScript Error';
        Instalog.sendCrash(errorName, formatErrorReport(error)).catch(
          console.error
        );
        originalHandler(error, isFatal);
      });
      return;
    }

    // Simple error cache for grouping
    type ErrorEntry = {
      error: Error;
      isFatal?: boolean;
      timestamp: number;
    };

    // Keep a map of error signatures to their occurrences
    const errorMap: Record<
      string,
      {
        count: number;
        errors: ErrorEntry[];
        firstTimestamp: number;
        lastTimestamp: number;
        reportSent: boolean;
      }
    > = {};

    // Create error signature for grouping similar errors
    const getErrorSignature = (error: Error): string => {
      return `${error.name}:${error.message.slice(0, 100)}`;
    };

    // Check if network is available for sending reports
    const isNetworkAvailable = async (): Promise<boolean> => {
      if (!errorGroupingConfig.requireNetwork) {
        return true;
      }

      try {
        // Make a network request to api.instalog.dev/ping to check connectivity
        // Use a standard timeout approach with Promise.race
        const timeoutPromise = new Promise<Response>((_, reject) => {
          setTimeout(
            () => reject(new Error('Network request timed out')),
            3000
          );
        });

        const fetchPromise = fetch('https://api.instalog.dev/ping', {
          method: 'GET',
        });
        const response = (await Promise.race([
          fetchPromise,
          timeoutPromise,
        ])) as Response;

        return response.ok;
      } catch (e) {
        // If the request fails, we assume no network is available
        console.log('Network check failed:', e);
        return false;
      }
    };

    // Function to flush specific error groups or all of them
    const flushErrorGroups = async (forceFlushAll = false): Promise<void> => {
      // Check network first if required
      if (errorGroupingConfig.requireNetwork) {
        const networkAvailable = await isNetworkAvailable();
        if (!networkAvailable) {
          return; // Don't flush if network isn't available
        }
      }

      const now = Date.now();
      Object.keys(errorMap).forEach((signature) => {
        const group = errorMap[signature];
        if (!group) return;

        const shouldFlush =
          forceFlushAll ||
          (!group.reportSent &&
            now - group.firstTimestamp >= errorGroupingConfig.timeWindowMs);

        if (shouldFlush) {
          // Create a dummy error to trigger the handler (which handles the actual reporting)
          const dummyError = new Error(`Flushing error group: ${signature}`);
          try {
            errorUtils.getGlobalHandler()(dummyError, false);
          } catch (e) {
            console.error('Error flushing error group:', e);
          }
        }
      });
    };

    // Set the global error handler
    errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      const now = Date.now();
      const signature = getErrorSignature(error);

      // Initialize group if it doesn't exist
      if (!errorMap[signature]) {
        errorMap[signature] = {
          count: 0,
          errors: [],
          firstTimestamp: now,
          lastTimestamp: now,
          reportSent: false,
        };
      }

      const group = errorMap[signature];
      group.count++;
      group.lastTimestamp = now;

      // Add error to the group
      const entry: ErrorEntry = {
        error,
        isFatal,
        timestamp: now,
      };
      group.errors.push(entry);

      // Limit stored errors to avoid memory issues
      if (group.errors.length > errorGroupingConfig.maxErrorsPerGroup) {
        // Keep first error (if it exists) and most recent ones
        const firstError = group.errors[0];
        if (firstError) {
          group.errors = [
            firstError,
            ...group.errors.slice(-(errorGroupingConfig.maxErrorsPerGroup - 1)),
          ];
        } else {
          // If first error somehow doesn't exist, just keep most recent ones
          group.errors = group.errors.slice(
            -errorGroupingConfig.maxErrorsPerGroup
          );
        }
      }

      // Determine if we should send a report now
      const shouldSendReport =
        isFatal || // Always send fatal errors immediately
        (group.count >= errorGroupingConfig.errorThreshold &&
          !group.reportSent) || // Send when threshold is reached
        (now - group.firstTimestamp >= errorGroupingConfig.timeWindowMs &&
          !group.reportSent); // Send after time window

      if (shouldSendReport && group.errors.length > 0) {
        // Mark as reported to avoid sending duplicates
        group.reportSent = true;

        // Create the grouped error report
        const timeWindow = group.lastTimestamp - group.firstTimestamp;

        // Safely get the most recent error, defaulting to the first one if unavailable
        const lastErrorIndex = group.errors.length - 1;
        const primaryError =
          lastErrorIndex >= 0 ? group.errors[lastErrorIndex]?.error : error; // Fallback to current error

        // Count fatal vs non-fatal errors
        const fatalCount = group.errors.filter((e) => e.isFatal).length;

        const report = {
          name: primaryError?.name || 'Unknown Error',
          message: primaryError?.message || 'No message',
          occurrences: group.count,
          timeWindowMs: timeWindow,
          errorRate:
            timeWindow > 0 ? (group.count / (timeWindow / 1000)).toFixed(2) : 0,
          firstOccurrence: new Date(group.firstTimestamp).toISOString(),
          lastOccurrence: new Date(group.lastTimestamp).toISOString(),
          errorSummary: group.errors.map((e) => ({
            name: e.error.name,
            message: e.error.message,
            time: new Date(e.timestamp).toISOString(),
            isFatal: !!e.isFatal,
          })),
          // Include the stack trace of the most recent error
          stack: primaryError?.stack || '',
          platform: Platform.OS,
          platformVersion: Platform.Version,
        };

        // Select the report name based on fatal ratio
        const isMostlyFatal = fatalCount > group.errors.length / 2;
        const reportName = isMostlyFatal
          ? 'Grouped Fatal JavaScript Errors'
          : 'Grouped Non-Fatal JavaScript Errors';

        // Send to Instalog
        Instalog.sendCrash(reportName, JSON.stringify(report, null, 2)).catch(
          console.error
        );

        // Reset for next batch of errors
        delete errorMap[signature];
      }

      // Always call the original handler
      originalHandler(error, isFatal);
    });

    // Set up dynamic flush interval management
    let currentFlushInterval = errorGroupingConfig.flushIntervalMs;
    let intervalId: NodeJS.Timeout | null = null;

    // Function to adjust the flush interval based on error volume
    const adjustFlushInterval = () => {
      if (!errorGroupingConfig.dynamicFlushInterval) return;

      const errorCount = Object.keys(errorMap).length;
      let newInterval = errorGroupingConfig.flushIntervalMs;

      // Adjust interval based on error volume
      if (errorCount > 20) {
        newInterval = Math.max(5000, errorGroupingConfig.flushIntervalMs / 4); // Min 5s, max 1/4 of config
      } else if (errorCount > 10) {
        newInterval = Math.max(10000, errorGroupingConfig.flushIntervalMs / 2); // Min 10s, max 1/2 of config
      } else if (errorCount < 2) {
        newInterval = errorGroupingConfig.flushIntervalMs; // Back to normal
      }

      // Only update if significantly different (avoid constant small changes)
      if (Math.abs(newInterval - currentFlushInterval) > 5000) {
        currentFlushInterval = newInterval;

        // Clear existing interval and set new one
        if (intervalId) {
          clearInterval(intervalId);
        }
        intervalId = setInterval(() => {
          flushErrorGroups();
          adjustFlushInterval(); // Re-adjust after flushing
        }, currentFlushInterval);
      }
    };

    // Start the initial interval
    intervalId = setInterval(() => {
      flushErrorGroups();
      adjustFlushInterval(); // Adjust interval after each flush
    }, currentFlushInterval);

    // Handle app state changes
    if (errorGroupingConfig.flushOnBackground) {
      const appStateListener = AppState.addEventListener(
        'change',
        async (nextAppState) => {
          if (nextAppState === 'background') {
            await flushErrorGroups(true); // Force flush all
          }
        }
      );

      // Clean up listener on module unload if possible
      try {
        if (typeof module !== 'undefined' && (module as any).hot) {
          (module as any).hot.dispose(() => {
            appStateListener.remove();
          });
        }
      } catch (e) {
        // Ignore errors related to module.hot
      }
    }

    // Clean up interval on module unload
    try {
      if (typeof module !== 'undefined' && (module as any).hot) {
        (module as any).hot.dispose(() => {
          if (intervalId) {
            clearInterval(intervalId);
          }
        });
      }
    } catch (e) {
      // Ignore errors related to module.hot
    }
  }
};

export const Instalog = {
  initialize: (apiKey: string, options?: InstalogOptions): Promise<void> => {
    const defaultOptions: InstalogOptions = {
      isCrashEnabled: false,
      isFeedbackEnabled: false,
      isLogEnabled: false,
      isLoggerEnabled: false,
      autoCaptureCrashes: false,
      errorGrouping: {
        enabled: true,
        flushIntervalMs: 30000,
        errorThreshold: 5,
        timeWindowMs: 60000,
        flushOnBackground: true,
        requireNetwork: true,
        maxErrorsPerGroup: 10,
        dynamicFlushInterval: true,
      },
    };

    const mergedOptions = { ...defaultOptions, ...options };

    // Set up global error handler if autoCaptureCrashes is enabled
    if (mergedOptions.autoCaptureCrashes !== false) {
      setupGlobalErrorHandler(mergedOptions);
    }

    // Only send the native options that the native SDK expects
    const nativeOptions = {
      isLogEnabled: mergedOptions.isLogEnabled,
      isLoggerEnabled: mergedOptions.isLoggerEnabled,
      isCrashEnabled: mergedOptions.isCrashEnabled,
      isFeedbackEnabled: mergedOptions.isFeedbackEnabled,
    };

    return InstalogRN.initialize(apiKey, nativeOptions);
  },
  log: (event: string, properties?: Record<string, any>): Promise<void> =>
    InstalogRN.log(event, properties),
  identifyUser: (userId: string): Promise<void> =>
    InstalogRN.identifyUser(userId),
  simulateCrash: (): Promise<void> => InstalogRN.simulateCrash(),
  showFeedbackModal: (): Promise<void> => InstalogRN.showFeedbackModal(),
  sendCrash: (name: string, report: string): Promise<boolean> =>
    InstalogRN.sendCrash(name, report),
  // Expose the error boundary component
  ErrorBoundary,
  // Expose the formatErrorReport utility
  formatErrorReport,
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#dc3545',
  },
  errorMessage: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: '#343a40',
  },
  resetButton: {
    backgroundColor: '#6B4EFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
