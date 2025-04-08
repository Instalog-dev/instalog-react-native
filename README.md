# react-native-instalog

React Native SDK for Instalog - a developer tool for debugging mobile apps. It provides error tracking, crash reporting, user feedback collection, and event logging capabilities for React Native applications.

## Installation

```sh
npm i @instalog.dev/react-native
```

## Platform-specific Setup

### Android

For feedback functionality on Android, ensure you have the Instalog activity registered in your AndroidManifest.xml:

```xml
<activity
  android:name="dev.instalog.mobile.feedback.InstalogFeedbackActivity"
  android:label="Instalog"
  android:theme="@style/Theme.Instalog"/>
```

## Usage

### Initialization

Initialize Instalog at the beginning of your app, typically in your main App file:

```js
import { Instalog } from 'react-native-instalog';

// Initialize with default options
await Instalog.initialize('YOUR_API_KEY');

// Or with custom options
await Instalog.initialize('YOUR_API_KEY', {
  isFeedbackEnabled: true,
  isCrashEnabled: true,
  isLogEnabled: true,
  isLoggerEnabled: true,
  autoCaptureCrashes: true,
  errorGrouping: {
    enabled: true,
    flushIntervalMs: 30000,
    errorThreshold: 5,
    timeWindowMs: 60000,
    flushOnBackground: true,
  },
});
```

### User Identification

Identify your users to associate logged events and crashes with specific users:

```js
await Instalog.identifyUser('user_id_or_email');
```

### Event Logging

Log specific events with optional properties:

```js
await Instalog.log('button_clicked', {
  screen: 'HomeScreen',
  buttonType: 'primary',
  timestamp: new Date().toISOString(),
});
```

### Error Boundary

Use the ErrorBoundary component to catch and report React component errors:

```jsx
import { Instalog } from 'react-native-instalog';

export default function App() {
  return (
    <Instalog.ErrorBoundary
      fallback={<YourCustomErrorScreen />}
      onError={(error, errorInfo) => {
        // Handle the error event, if needed
        console.log('Caught an error:', error);
      }}
    >
      <YourApp />
    </Instalog.ErrorBoundary>
  );
}
```

### Manual Error Reporting

Send manual error reports:

```js
try {
  // Some code that might throw
  riskyOperation();
} catch (error) {
  if (error instanceof Error) {
    // Format the error into a report
    const report = Instalog.formatErrorReport(error);
    
    // Send the report to Instalog
    await Instalog.sendCrash('Custom Error Name', report);
  }
}
```

### User Feedback

Show a feedback modal to collect user feedback:

```js
await Instalog.showFeedbackModal();
```

### Test/Debug Methods

```js
// Simulate a crash for testing
await Instalog.simulateCrash();
```

## API Reference

### Instalog

| Method | Description |
|--------|-------------|
| `initialize(apiKey, options)` | Initializes the Instalog SDK with API key and options |
| `identifyUser(userId)` | Sets the user ID for tracking |
| `log(event, properties)` | Logs an event with optional properties |
| `sendCrash(name, report)` | Manually sends a crash report |
| `showFeedbackModal()` | Shows the feedback collection UI |
| `simulateCrash()` | Simulates a crash for testing |
| `formatErrorReport(error, errorInfo)` | Formats an error into a structured report |
| `ErrorBoundary` | React component to catch and report rendering errors |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `isCrashEnabled` | boolean | false | Enable crash reporting |
| `isFeedbackEnabled` | boolean | false | Enable user feedback collection |
| `isLogEnabled` | boolean | false | Enable event logging |
| `isLoggerEnabled` | boolean | false | Enable console logging |
| `autoCaptureCrashes` | boolean | false | Automatically capture unhandled JS errors |
| `errorGrouping` | object | See below | Configuration for error grouping behavior |

#### Error Grouping Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | true | Whether to enable error grouping |
| `flushIntervalMs` | number | 30000 | Interval between error group flush checks (ms) |
| `errorThreshold` | number | 5 | Number of occurrences before sending a group report |
| `timeWindowMs` | number | 60000 | Max age before sending a group report (ms) |
| `flushOnBackground` | boolean | true | Flush errors when app goes to background |
| `requireNetwork` | boolean | true | Check network status before sending reports |
| `maxErrorsPerGroup` | number | 10 | Max errors to store per group |
| `dynamicFlushInterval` | boolean | true | Enable dynamic flush intervals based on error frequency |

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
