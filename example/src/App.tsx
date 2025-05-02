/* eslint-disable react-native/no-inline-styles */
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useEffect, useState } from 'react';
import { Instalog } from '@instalog.dev/react-native';

// Basic fallback UI for errors
const BasicErrorFallback = () => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorTitle}>Something went wrong</Text>
    <Text style={styles.errorMessage}>
      The app encountered an error. It has been reported to Instalog.
    </Text>
    <TouchableOpacity
      style={styles.resetButton}
      onPress={() => Alert.alert('Action', 'App would restart here')}
    >
      <Text style={styles.resetButtonText}>Reload App</Text>
    </TouchableOpacity>
  </View>
);

// Detailed fallback UI that displays error details
const DetailedErrorFallback = ({ error }: { error: Error | null }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorTitle}>Error Detected</Text>
    <Text style={styles.errorName}>{error?.name || 'Unknown Error'}</Text>
    <Text style={styles.errorMessage}>
      {error?.message || 'An unknown error occurred'}
    </Text>
    <View style={styles.divider} />
    <Text style={styles.errorTips}>
      This error has been automatically reported to our team. You can try:
    </Text>
    <View style={styles.buttonGroup}>
      <TouchableOpacity
        style={[styles.resetButton, { backgroundColor: '#4CAF50' }]}
        onPress={() => Alert.alert('Reload', 'Reloading app...')}
      >
        <Text style={styles.resetButtonText}>Reload App</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.resetButton,
          { backgroundColor: '#007bff', marginTop: 12 },
        ]}
        onPress={() => Alert.alert('Support', 'Contacting support...')}
      >
        <Text style={styles.resetButtonText}>Contact Support</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function App() {
  const [apiKey, setApiKey] = useState(
    'instalog_c573385b790942c0b36fbe08463d94c7'
  );
  const [useFallback, setUseFallback] = useState(true);
  const [detailedFallback, setDetailedFallback] = useState(false);

  useEffect(() => {
    // Initialize Instalog when app starts with a valid API key
    if (apiKey) {
      // Initialize with autoCaptureCrashes enabled (default is true)
      Instalog.initialize(apiKey, {
        isFeedbackEnabled: true,
        isCrashEnabled: true,
        isLogEnabled: true,
        isLoggerEnabled: true,
        errorGrouping: {
          enabled: true,
          flushIntervalMs: 30000,
          errorThreshold: 5,
          timeWindowMs: 60000,
          flushOnBackground: true,
        },
        autoCaptureCrashes: true,
      }).catch(console.error);

      Instalog.identifyUser('test@gmail.com').catch(console.error);
    }
  }, [apiKey]);

  // Function to cause an error for testing error boundary
  const causeComponentError = () => {
    // This will be caught by the ErrorBoundary
    const obj: any = null;
    obj!.nonExistentMethod();
  };

  // Function to cause a global JS error
  const causeGlobalError = () => {
    setTimeout(() => {
      // This will be caught by the global error handler
      throw new Error('Test global error handler');
    }, 0);
  };

  // Test manual error reporting
  const sendManualErrorReport = () => {
    try {
      // Simulate some code that might fail
      const testArray = [1, 2, 3];
      // Access an out-of-bounds index to trigger error
      const inaccessible = testArray[99];
      if (inaccessible === undefined) {
        throw new Error('Array index out of bounds');
      }
    } catch (error) {
      // Manually send the error to Instalog
      if (error instanceof Error) {
        const report = Instalog.formatErrorReport(error);
        Instalog.sendCrash('Manual Error Report', report)
          .then((success) => {
            console.log('Manual report sent:', success);
            Alert.alert('Success', 'Manual error report sent to Instalog');
          })
          .catch(console.error);
      }
    }
  };

  const handleSendEvent = () => {
    Instalog.log('button_clicked', {
      timestamp: new Date().toISOString(),
    }).catch(console.error);
  };

  const handleSimulateCrash = () => {
    Instalog.simulateCrash().catch(console.error);
  };

  const handleShowFeedback = () => {
    Instalog.showFeedbackModal().catch(console.error);
  };

  const toggleFallback = () => {
    setUseFallback(!useFallback);
  };

  const toggleDetailedFallback = () => {
    setDetailedFallback(!detailedFallback);
  };

  // Choose which fallback to use based on state
  const getFallback = () => {
    if (!useFallback) {
      return undefined; // No fallback, ErrorBoundary will use default (null)
    }

    return detailedFallback ? (
      <DetailedErrorFallback error={null} />
    ) : (
      <BasicErrorFallback />
    );
  };

  // Wrap the content with Instalog's ErrorBoundary
  return (
    <Instalog.ErrorBoundary
      fallback={getFallback()}
      onError={(error) => {
        console.log('ErrorBoundary caught an error:', error.message);
      }}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Instalog</Text>
        <Text style={styles.subtitle}>Error Capturing Demo</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter api key..."
          value={apiKey}
          onChangeText={setApiKey}
        />
        <View style={{ height: 16 }} />

        {/* Fallback configuration controls */}
        <View style={styles.settingsContainer}>
          <Text style={styles.settingsTitle}>Error Boundary Settings:</Text>
          <View style={styles.checkboxRow}>
            <TouchableOpacity
              style={[styles.checkbox, useFallback && styles.checkboxActive]}
              onPress={toggleFallback}
            />
            <Text style={styles.checkboxLabel}>Use Custom Fallback</Text>
          </View>

          <View style={styles.checkboxRow}>
            <TouchableOpacity
              style={[
                styles.checkbox,
                detailedFallback && styles.checkboxActive,
                !useFallback && styles.checkboxDisabled,
              ]}
              onPress={toggleDetailedFallback}
              disabled={!useFallback}
            />
            <Text
              style={[
                styles.checkboxLabel,
                !useFallback && styles.checkboxLabelDisabled,
              ]}
            >
              Use Detailed Fallback
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.feedbackButton]}
          onPress={handleShowFeedback}
        >
          <Text style={styles.buttonText}>Feedback</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.eventButton]}
          onPress={handleSendEvent}
        >
          <Text style={styles.buttonText}>Send Event</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.crashButton]}
          onPress={handleSimulateCrash}
        >
          <Text style={styles.buttonText}>Simulate Crash</Text>
        </TouchableOpacity>

        {/* Error testing buttons */}
        <TouchableOpacity
          style={[styles.button, styles.errorButton]}
          onPress={causeComponentError}
        >
          <Text style={styles.buttonText}>Test Error Boundary</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.errorButton]}
          onPress={causeGlobalError}
        >
          <Text style={styles.buttonText}>Test Global Error</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.manualButton]}
          onPress={sendManualErrorReport}
        >
          <Text style={styles.buttonText}>Manual Error Report</Text>
        </TouchableOpacity>
      </View>
    </Instalog.ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  input: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
  },
  button: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackButton: {
    backgroundColor: '#4CAF50',
  },
  eventButton: {
    backgroundColor: '#000',
  },
  crashButton: {
    backgroundColor: '#6B4EFF',
  },
  errorButton: {
    backgroundColor: '#dc3545',
  },
  manualButton: {
    backgroundColor: '#fd7e14',
  },
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
  errorName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  errorMessage: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: '#343a40',
  },
  errorTips: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    color: '#666',
  },
  divider: {
    height: 1,
    width: '80%',
    backgroundColor: '#ddd',
    marginBottom: 20,
  },
  buttonGroup: {
    width: '100%',
    alignItems: 'center',
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
  settingsContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#6B4EFF',
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: '#6B4EFF',
  },
  checkboxDisabled: {
    borderColor: '#ccc',
    backgroundColor: '#eee',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  checkboxLabelDisabled: {
    color: '#999',
  },
});
