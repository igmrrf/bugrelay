# Integration Examples

This guide provides real-world examples of integrating BugRelay into different types of applications and workflows. Each example includes complete code and step-by-step instructions.

## Table of Contents

- [Web Application Integration](#web-application-integration)
- [Mobile App Integration](#mobile-app-integration)
- [Automated Testing Integration](#automated-testing-integration)
- [CI/CD Pipeline Integration](#cicd-pipeline-integration)
- [Customer Support Integration](#customer-support-integration)
- [Analytics and Monitoring](#analytics-and-monitoring)

## Web Application Integration

### React Application with Error Boundary

Create a comprehensive error reporting system for your React application:

```jsx
// BugReportProvider.jsx
import React, { createContext, useContext, useState } from 'react';
import { BugRelayClient } from '@bugrelay/sdk';

const BugReportContext = createContext();

export const useBugReport = () => {
  const context = useContext(BugReportContext);
  if (!context) {
    throw new Error('useBugReport must be used within BugReportProvider');
  }
  return context;
};

export const BugReportProvider = ({ children, apiToken, applicationId }) => {
  const [client] = useState(() => new BugRelayClient('https://api.bugrelay.com', apiToken));
  const [isReporting, setIsReporting] = useState(false);

  const reportBug = async (bugData) => {
    setIsReporting(true);
    try {
      const result = await client.createBug({
        ...bugData,
        application_id: applicationId,
        // Add browser and system info
        browser_version: navigator.userAgent,
        operating_system: navigator.platform,
        app_version: process.env.REACT_APP_VERSION,
        // Add current page context
        tags: [...(bugData.tags || []), 'web', 'user-report'],
        description: `${bugData.description}\n\nPage: ${window.location.href}\nTimestamp: ${new Date().toISOString()}`
      });
      return result;
    } finally {
      setIsReporting(false);
    }
  };

  const reportError = async (error, errorInfo = {}) => {
    return reportBug({
      title: `Unhandled Error: ${error.message}`,
      description: `
        Error Message: ${error.message}
        Stack Trace: ${error.stack}
        Component Stack: ${errorInfo.componentStack || 'N/A'}
        Props: ${JSON.stringify(errorInfo.props || {}, null, 2)}
        State: ${JSON.stringify(errorInfo.state || {}, null, 2)}
      `,
      priority: 'high',
      tags: ['automatic', 'error', 'frontend']
    });
  };

  return (
    <BugReportContext.Provider value={{ reportBug, reportError, isReporting }}>
      {children}
    </BugReportContext.Provider>
  );
};

// ErrorBoundary.jsx
import React from 'react';
import { useBugReport } from './BugReportProvider';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Report error automatically
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>The error has been automatically reported to our team.</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Enhanced ErrorBoundary with BugRelay integration
export const BugReportingErrorBoundary = ({ children, ...props }) => {
  const { reportError } = useBugReport();

  return (
    <ErrorBoundary onError={reportError} {...props}>
      {children}
    </ErrorBoundary>
  );
};

// BugReportWidget.jsx - User-facing bug report form
import React, { useState } from 'react';
import { useBugReport } from './BugReportProvider';

export const BugReportWidget = ({ trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    tags: []
  });
  const { reportBug, isReporting } = useBugReport();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await reportBug(formData);
      setFormData({ title: '', description: '', priority: 'medium', tags: [] });
      setIsOpen(false);
      alert('Bug report submitted successfully!');
    } catch (error) {
      alert('Failed to submit bug report: ' + error.message);
    }
  };

  return (
    <>
      {React.cloneElement(trigger, { onClick: () => setIsOpen(true) })}
      
      {isOpen && (
        <div className="bug-report-modal">
          <div className="modal-content">
            <h3>Report a Bug</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title:</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description:</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="4"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Priority:</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={() => setIsOpen(false)}>Cancel</button>
                <button type="submit" disabled={isReporting}>
                  {isReporting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// App.jsx - Main application setup
import React from 'react';
import { BugReportProvider, BugReportingErrorBoundary } from './components/BugReport';
import { BugReportWidget } from './components/BugReportWidget';

function App() {
  return (
    <BugReportProvider 
      apiToken={process.env.REACT_APP_BUGRELAY_TOKEN}
      applicationId={process.env.REACT_APP_APPLICATION_ID}
    >
      <BugReportingErrorBoundary>
        <div className="App">
          <header>
            <h1>My Application</h1>
            <BugReportWidget trigger={<button>Report Bug</button>} />
          </header>
          
          <main>
            {/* Your application content */}
          </main>
        </div>
      </BugReportingErrorBoundary>
    </BugReportProvider>
  );
}

export default App;
```

### Vue.js Application Integration

```javascript
// plugins/bugrelay.js
import { BugRelayClient } from '@bugrelay/sdk';

export default {
  install(app, options) {
    const client = new BugRelayClient(options.apiUrl, options.token);
    
    app.config.globalProperties.$bugRelay = client;
    app.provide('bugRelay', client);
    
    // Global error handler
    app.config.errorHandler = async (error, instance, info) => {
      console.error('Vue Error:', error);
      
      try {
        await client.createBug({
          title: `Vue Error: ${error.message}`,
          description: `
            Error: ${error.message}
            Stack: ${error.stack}
            Component: ${instance?.$options.name || 'Unknown'}
            Info: ${info}
            Route: ${instance?.$route?.path || 'Unknown'}
          `,
          application_id: options.applicationId,
          priority: 'high',
          tags: ['automatic', 'vue', 'error']
        });
      } catch (reportError) {
        console.error('Failed to report error:', reportError);
      }
    };
  }
};

// main.js
import { createApp } from 'vue';
import App from './App.vue';
import BugRelayPlugin from './plugins/bugrelay';

const app = createApp(App);

app.use(BugRelayPlugin, {
  apiUrl: 'https://api.bugrelay.com',
  token: process.env.VUE_APP_BUGRELAY_TOKEN,
  applicationId: process.env.VUE_APP_APPLICATION_ID
});

app.mount('#app');

// components/BugReportForm.vue
<template>
  <div class="bug-report-form">
    <form @submit.prevent="submitBug">
      <div class="form-group">
        <label for="title">Title:</label>
        <input v-model="form.title" type="text" id="title" required />
      </div>
      
      <div class="form-group">
        <label for="description">Description:</label>
        <textarea v-model="form.description" id="description" rows="4" required></textarea>
      </div>
      
      <div class="form-group">
        <label for="priority">Priority:</label>
        <select v-model="form.priority" id="priority">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      
      <button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Submitting...' : 'Submit Bug Report' }}
      </button>
    </form>
  </div>
</template>

<script>
import { inject, ref, reactive } from 'vue';

export default {
  name: 'BugReportForm',
  setup() {
    const bugRelay = inject('bugRelay');
    const isSubmitting = ref(false);
    const form = reactive({
      title: '',
      description: '',
      priority: 'medium'
    });

    const submitBug = async () => {
      isSubmitting.value = true;
      try {
        await bugRelay.createBug({
          ...form,
          tags: ['user-report', 'web']
        });
        
        // Reset form
        Object.assign(form, {
          title: '',
          description: '',
          priority: 'medium'
        });
        
        alert('Bug report submitted successfully!');
      } catch (error) {
        alert('Failed to submit bug report: ' + error.message);
      } finally {
        isSubmitting.value = false;
      }
    };

    return {
      form,
      isSubmitting,
      submitBug
    };
  }
};
</script>
```

## Mobile App Integration

### React Native Integration

```javascript
// services/BugRelayService.js
import { BugRelayClient } from '@bugrelay/react-native-sdk';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { getVersion, getBuildNumber } from 'react-native-device-info';

class BugRelayService {
  constructor() {
    this.client = new BugRelayClient('https://api.bugrelay.com');
    this.applicationId = 'your-mobile-app-id';
    this.isInitialized = false;
  }

  async initialize(userToken = null) {
    if (userToken) {
      this.client.setToken(userToken);
    }
    
    // Get device information
    this.deviceInfo = {
      platform: Platform.OS,
      version: Platform.Version,
      deviceModel: await DeviceInfo.getModel(),
      systemVersion: await DeviceInfo.getSystemVersion(),
      appVersion: getVersion(),
      buildNumber: getBuildNumber(),
      deviceId: await DeviceInfo.getUniqueId()
    };
    
    this.isInitialized = true;
  }

  async reportBug(bugData) {
    if (!this.isInitialized) {
      throw new Error('BugRelayService not initialized');
    }

    return this.client.createBug({
      ...bugData,
      application_id: this.applicationId,
      operating_system: `${this.deviceInfo.platform} ${this.deviceInfo.systemVersion}`,
      device_type: this.deviceInfo.deviceModel,
      app_version: `${this.deviceInfo.appVersion} (${this.deviceInfo.buildNumber})`,
      tags: [...(bugData.tags || []), 'mobile', this.deviceInfo.platform]
    });
  }

  async reportCrash(error, errorInfo = {}) {
    return this.reportBug({
      title: `App Crash: ${error.message}`,
      description: `
        Error: ${error.message}
        Stack: ${error.stack}
        Screen: ${errorInfo.screen || 'Unknown'}
        User Action: ${errorInfo.userAction || 'Unknown'}
        Device Info: ${JSON.stringify(this.deviceInfo, null, 2)}
      `,
      priority: 'critical',
      tags: ['crash', 'automatic']
    });
  }
}

export default new BugRelayService();

// components/ErrorBoundary.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BugRelayService from '../services/BugRelayService';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  async componentDidCatch(error, errorInfo) {
    try {
      await BugRelayService.reportCrash(error, {
        screen: this.props.screenName,
        userAction: this.props.lastUserAction,
        ...errorInfo
      });
    } catch (reportError) {
      console.error('Failed to report crash:', reportError);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorMessage}>
            The error has been automatically reported to our team.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ErrorBoundary;

// components/BugReportModal.js
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import BugRelayService from '../services/BugRelayService';

const BugReportModal = ({ visible, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await BugRelayService.reportBug({
        ...formData,
        tags: ['user-report', 'mobile']
      });
      
      Alert.alert('Success', 'Bug report submitted successfully!');
      setFormData({ title: '', description: '', priority: 'medium' });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit bug report: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Report a Bug</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Brief description of the issue"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Detailed description of the bug"
              multiline
              numberOfLines={4}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Priority</Text>
            <Picker
              selectedValue={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
              style={styles.picker}
            >
              <Picker.Item label="Low" value="low" />
              <Picker.Item label="Medium" value="medium" />
              <Picker.Item label="High" value="high" />
              <Picker.Item label="Critical" value="critical" />
            </Picker>
          </View>
          
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Bug Report'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#007bff',
    fontSize: 16,
  },
  form: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BugReportModal;
```

## Automated Testing Integration

### Jest Test Integration

```javascript
// utils/testReporting.js
import { BugRelayClient } from '@bugrelay/sdk';

class TestReportingService {
  constructor() {
    this.client = new BugRelayClient(
      process.env.BUGRELAY_API_URL || 'https://api.bugrelay.com',
      process.env.BUGRELAY_TEST_TOKEN
    );
    this.applicationId = process.env.BUGRELAY_APPLICATION_ID;
    this.testRun = {
      id: Date.now().toString(),
      startTime: new Date(),
      failures: []
    };
  }

  async reportTestFailure(testName, error, testInfo = {}) {
    const failure = {
      testName,
      error: error.message,
      stack: error.stack,
      ...testInfo
    };
    
    this.testRun.failures.push(failure);

    // Report critical failures immediately
    if (testInfo.critical || testName.includes('critical')) {
      await this.client.createBug({
        title: `Test Failure: ${testName}`,
        description: `
          Test: ${testName}
          Error: ${error.message}
          Stack: ${error.stack}
          Test Suite: ${testInfo.suiteName || 'Unknown'}
          Environment: ${process.env.NODE_ENV || 'test'}
          CI Build: ${process.env.CI_BUILD_NUMBER || 'local'}
          Branch: ${process.env.GIT_BRANCH || 'unknown'}
        `,
        application_id: this.applicationId,
        priority: 'high',
        tags: ['test-failure', 'automated', 'ci']
      });
    }
  }

  async reportTestSummary() {
    if (this.testRun.failures.length === 0) return;

    const summary = {
      totalFailures: this.testRun.failures.length,
      duration: Date.now() - this.testRun.startTime.getTime(),
      failures: this.testRun.failures
    };

    await this.client.createBug({
      title: `Test Run Summary: ${summary.totalFailures} failures`,
      description: `
        Test Run ID: ${this.testRun.id}
        Total Failures: ${summary.totalFailures}
        Duration: ${summary.duration}ms
        Environment: ${process.env.NODE_ENV || 'test'}
        
        Failures:
        ${summary.failures.map(f => `- ${f.testName}: ${f.error}`).join('\n')}
      `,
      application_id: this.applicationId,
      priority: summary.totalFailures > 5 ? 'critical' : 'high',
      tags: ['test-summary', 'automated', 'ci']
    });
  }
}

export default new TestReportingService();

// jest.setup.js
import TestReportingService from './utils/testReporting';

// Global test failure handler
jasmine.getEnv().addReporter({
  specDone: async (result) => {
    if (result.status === 'failed') {
      const error = new Error(result.failedExpectations[0]?.message || 'Test failed');
      error.stack = result.failedExpectations[0]?.stack;
      
      await TestReportingService.reportTestFailure(
        result.fullName,
        error,
        {
          suiteName: result.description,
          critical: result.fullName.includes('[CRITICAL]')
        }
      );
    }
  },
  
  jasmineDone: async () => {
    await TestReportingService.reportTestSummary();
  }
});

// Custom test utilities
export const criticalTest = (name, fn) => {
  return test(`[CRITICAL] ${name}`, fn);
};

export const withBugReporting = (testFn) => {
  return async (...args) => {
    try {
      return await testFn(...args);
    } catch (error) {
      // Additional context can be added here
      throw error;
    }
  };
};

// Example test file
// __tests__/api.test.js
import { criticalTest, withBugReporting } from '../jest.setup';
import { apiClient } from '../src/api';

describe('API Integration Tests', () => {
  criticalTest('user authentication should work', withBugReporting(async () => {
    const response = await apiClient.login('test@example.com', 'password');
    expect(response.success).toBe(true);
    expect(response.data.access_token).toBeDefined();
  }));

  test('bug creation should validate required fields', withBugReporting(async () => {
    const invalidBug = { title: '' }; // Missing required fields
    
    await expect(apiClient.createBug(invalidBug)).rejects.toThrow();
  }));
});
```

## CI/CD Pipeline Integration

### GitHub Actions Integration

```yaml
# .github/workflows/test-and-report.yml
name: Test and Bug Reporting

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests with bug reporting
      env:
        BUGRELAY_API_URL: ${{ secrets.BUGRELAY_API_URL }}
        BUGRELAY_TEST_TOKEN: ${{ secrets.BUGRELAY_TEST_TOKEN }}
        BUGRELAY_APPLICATION_ID: ${{ secrets.BUGRELAY_APPLICATION_ID }}
        CI_BUILD_NUMBER: ${{ github.run_number }}
        GIT_BRANCH: ${{ github.ref_name }}
      run: npm test
    
    - name: Report deployment issues
      if: failure()
      uses: ./.github/actions/report-bug
      with:
        title: "CI/CD Pipeline Failure"
        description: "Build ${{ github.run_number }} failed on branch ${{ github.ref_name }}"
        priority: "high"
        tags: "ci,deployment,failure"

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to production
      run: ./deploy.sh
    
    - name: Run smoke tests
      run: npm run test:smoke
    
    - name: Report deployment success
      uses: ./.github/actions/report-bug
      with:
        title: "Deployment Successful"
        description: "Build ${{ github.run_number }} deployed successfully"
        priority: "low"
        tags: "deployment,success"
```

```yaml
# .github/actions/report-bug/action.yml
name: 'Report Bug to BugRelay'
description: 'Report issues to BugRelay from CI/CD pipeline'

inputs:
  title:
    description: 'Bug report title'
    required: true
  description:
    description: 'Bug report description'
    required: true
  priority:
    description: 'Bug priority'
    required: false
    default: 'medium'
  tags:
    description: 'Comma-separated tags'
    required: false
    default: 'ci'

runs:
  using: 'node16'
  main: 'index.js'
```

```javascript
// .github/actions/report-bug/index.js
const core = require('@actions/core');
const github = require('@actions/github');
const { BugRelayClient } = require('@bugrelay/sdk');

async function run() {
  try {
    const client = new BugRelayClient(
      process.env.BUGRELAY_API_URL,
      process.env.BUGRELAY_CI_TOKEN
    );

    const title = core.getInput('title');
    const description = core.getInput('description');
    const priority = core.getInput('priority');
    const tags = core.getInput('tags').split(',').map(tag => tag.trim());

    const context = github.context;
    
    const bugReport = await client.createBug({
      title,
      description: `
        ${description}
        
        CI/CD Context:
        - Repository: ${context.repo.owner}/${context.repo.repo}
        - Branch: ${context.ref}
        - Commit: ${context.sha}
        - Actor: ${context.actor}
        - Workflow: ${context.workflow}
        - Run Number: ${context.runNumber}
      `,
      application_id: process.env.BUGRELAY_APPLICATION_ID,
      priority,
      tags: [...tags, 'ci', 'automated']
    });

    core.setOutput('bug-id', bugReport.data.id);
    console.log(`Bug report created: ${bugReport.data.id}`);
    
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
```

## Customer Support Integration

### Zendesk Integration

```javascript
// services/ZendeskBugRelayIntegration.js
import { BugRelayClient } from '@bugrelay/sdk';
import axios from 'axios';

class ZendeskBugRelayIntegration {
  constructor(zendeskConfig, bugRelayConfig) {
    this.zendesk = axios.create({
      baseURL: `https://${zendeskConfig.subdomain}.zendesk.com/api/v2`,
      auth: {
        username: `${zendeskConfig.email}/token`,
        password: zendeskConfig.token
      }
    });
    
    this.bugRelay = new BugRelayClient(bugRelayConfig.apiUrl, bugRelayConfig.token);
    this.applicationId = bugRelayConfig.applicationId;
  }

  async syncTicketToBug(ticketId) {
    try {
      // Get ticket details from Zendesk
      const ticketResponse = await this.zendesk.get(`/tickets/${ticketId}.json`);
      const ticket = ticketResponse.data.ticket;
      
      // Get ticket comments
      const commentsResponse = await this.zendesk.get(`/tickets/${ticketId}/comments.json`);
      const comments = commentsResponse.data.comments;
      
      // Determine if this is a bug report
      const isBugReport = this.isBugReport(ticket, comments);
      
      if (!isBugReport) {
        return null;
      }
      
      // Create bug report in BugRelay
      const bugReport = await this.bugRelay.createBug({
        title: ticket.subject,
        description: this.formatTicketDescription(ticket, comments),
        application_id: this.applicationId,
        priority: this.mapPriority(ticket.priority),
        tags: ['zendesk', 'customer-report', ...this.extractTags(ticket)]
      });
      
      // Update Zendesk ticket with bug report link
      await this.zendesk.put(`/tickets/${ticketId}.json`, {
        ticket: {
          custom_fields: [
            {
              id: 'bug_report_id_field_id', // Your custom field ID
              value: bugReport.data.id
            }
          ]
        }
      });
      
      // Add internal note to ticket
      await this.zendesk.put(`/tickets/${ticketId}.json`, {
        ticket: {
          comment: {
            body: `Bug report created in BugRelay: ${bugReport.data.id}`,
            public: false
          }
        }
      });
      
      return bugReport;
      
    } catch (error) {
      console.error('Failed to sync ticket to bug:', error);
      throw error;
    }
  }

  isBugReport(ticket, comments) {
    const bugKeywords = ['bug', 'error', 'crash', 'broken', 'not working', 'issue'];
    const text = `${ticket.subject} ${ticket.description}`.toLowerCase();
    
    return bugKeywords.some(keyword => text.includes(keyword));
  }

  formatTicketDescription(ticket, comments) {
    const description = `
      Original Zendesk Ticket: #${ticket.id}
      Customer: ${ticket.requester_id}
      Created: ${ticket.created_at}
      
      Description:
      ${ticket.description}
      
      Additional Comments:
      ${comments.slice(1).map(comment => `
        ${comment.created_at}: ${comment.body}
      `).join('\n')}
    `;
    
    return description.trim();
  }

  mapPriority(zendeskPriority) {
    const priorityMap = {
      'low': 'low',
      'normal': 'medium',
      'high': 'high',
      'urgent': 'critical'
    };
    
    return priorityMap[zendeskPriority] || 'medium';
  }

  extractTags(ticket) {
    const tags = [];
    
    // Add tags based on ticket properties
    if (ticket.brand_id) tags.push(`brand-${ticket.brand_id}`);
    if (ticket.group_id) tags.push(`group-${ticket.group_id}`);
    
    return tags;
  }

  async setupWebhook() {
    // Create Zendesk webhook for new tickets
    const webhook = await this.zendesk.post('/webhooks.json', {
      webhook: {
        name: 'BugRelay Integration',
        endpoint: 'https://your-app.com/webhooks/zendesk',
        http_method: 'POST',
        status: 'active',
        subscriptions: ['conditional_ticket_events']
      }
    });
    
    return webhook.data;
  }
}

// Webhook handler for Express.js
export const handleZendeskWebhook = async (req, res) => {
  const integration = new ZendeskBugRelayIntegration(
    process.env.ZENDESK_CONFIG,
    process.env.BUGRELAY_CONFIG
  );
  
  try {
    const { ticket } = req.body;
    
    // Only process new tickets
    if (ticket.status === 'new') {
      const bugReport = await integration.syncTicketToBug(ticket.id);
      
      if (bugReport) {
        console.log(`Created bug report ${bugReport.data.id} for ticket ${ticket.id}`);
      }
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    res.status(500).json({ error: error.message });
  }
};
```

## Analytics and Monitoring

### Comprehensive Analytics Dashboard

```javascript
// services/BugRelayAnalytics.js
import { BugRelayClient } from '@bugrelay/sdk';

class BugRelayAnalytics {
  constructor(apiToken, applicationId) {
    this.client = new BugRelayClient('https://api.bugrelay.com', apiToken);
    this.applicationId = applicationId;
  }

  async getDashboardData(timeRange = '30d') {
    const [bugs, trends, topIssues] = await Promise.all([
      this.getBugStatistics(timeRange),
      this.getBugTrends(timeRange),
      this.getTopIssues(timeRange)
    ]);

    return {
      statistics: bugs,
      trends,
      topIssues,
      generatedAt: new Date().toISOString()
    };
  }

  async getBugStatistics(timeRange) {
    const bugs = await this.client.searchBugs({
      application_id: this.applicationId,
      created_after: this.getDateFromRange(timeRange)
    });

    const stats = {
      total: bugs.data.length,
      open: 0,
      fixed: 0,
      critical: 0,
      byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
      byStatus: { open: 0, reviewing: 0, fixed: 0, wont_fix: 0 }
    };

    bugs.data.forEach(bug => {
      stats.byPriority[bug.priority]++;
      stats.byStatus[bug.status]++;
      
      if (bug.status === 'open') stats.open++;
      if (bug.status === 'fixed') stats.fixed++;
      if (bug.priority === 'critical') stats.critical++;
    });

    return stats;
  }

  async getBugTrends(timeRange) {
    const days = this.getDaysFromRange(timeRange);
    const trends = [];

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const bugs = await this.client.searchBugs({
        application_id: this.applicationId,
        created_after: dayStart.toISOString(),
        created_before: dayEnd.toISOString()
      });

      trends.push({
        date: date.toISOString().split('T')[0],
        count: bugs.data.length,
        critical: bugs.data.filter(b => b.priority === 'critical').length
      });
    }

    return trends;
  }

  async getTopIssues(timeRange) {
    const bugs = await this.client.searchBugs({
      application_id: this.applicationId,
      created_after: this.getDateFromRange(timeRange),
      sort: 'vote_count',
      order: 'desc',
      limit: 10
    });

    return bugs.data.map(bug => ({
      id: bug.id,
      title: bug.title,
      votes: bug.vote_count,
      comments: bug.comment_count,
      priority: bug.priority,
      status: bug.status,
      tags: bug.tags
    }));
  }

  getDateFromRange(range) {
    const date = new Date();
    const days = this.getDaysFromRange(range);
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  getDaysFromRange(range) {
    const rangeMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    return rangeMap[range] || 30;
  }

  async generateReport(timeRange = '30d') {
    const data = await this.getDashboardData(timeRange);
    
    const report = `
# Bug Report Analytics - ${timeRange}

## Summary
- **Total Bugs**: ${data.statistics.total}
- **Open Bugs**: ${data.statistics.open}
- **Fixed Bugs**: ${data.statistics.fixed}
- **Critical Bugs**: ${data.statistics.critical}

## Priority Distribution
- Critical: ${data.statistics.byPriority.critical}
- High: ${data.statistics.byPriority.high}
- Medium: ${data.statistics.byPriority.medium}
- Low: ${data.statistics.byPriority.low}

## Status Distribution
- Open: ${data.statistics.byStatus.open}
- Reviewing: ${data.statistics.byStatus.reviewing}
- Fixed: ${data.statistics.byStatus.fixed}
- Won't Fix: ${data.statistics.byStatus.wont_fix}

## Top Issues
${data.topIssues.map((issue, index) => `
${index + 1}. **${issue.title}** (${issue.votes} votes, ${issue.priority} priority)
`).join('')}

## Trends
${data.trends.slice(-7).map(day => `
- ${day.date}: ${day.count} bugs (${day.critical} critical)
`).join('')}

Generated on: ${data.generatedAt}
    `;

    return report.trim();
  }
}

export default BugRelayAnalytics;

// React Dashboard Component
import React, { useState, useEffect } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import BugRelayAnalytics from '../services/BugRelayAnalytics';

const BugRelayDashboard = ({ apiToken, applicationId }) => {
  const [analytics] = useState(() => new BugRelayAnalytics(apiToken, applicationId));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const dashboardData = await analytics.getDashboardData(timeRange);
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading analytics...</div>;
  if (!data) return <div>Failed to load data</div>;

  const trendChartData = {
    labels: data.trends.map(t => t.date),
    datasets: [
      {
        label: 'Total Bugs',
        data: data.trends.map(t => t.count),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      },
      {
        label: 'Critical Bugs',
        data: data.trends.map(t => t.critical),
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1
      }
    ]
  };

  const priorityChartData = {
    labels: ['Low', 'Medium', 'High', 'Critical'],
    datasets: [{
      data: [
        data.statistics.byPriority.low,
        data.statistics.byPriority.medium,
        data.statistics.byPriority.high,
        data.statistics.byPriority.critical
      ],
      backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384', '#FF0000']
    }]
  };

  return (
    <div className="bugrelay-dashboard">
      <div className="dashboard-header">
        <h1>Bug Analytics Dashboard</h1>
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Bugs</h3>
          <div className="stat-value">{data.statistics.total}</div>
        </div>
        <div className="stat-card">
          <h3>Open Bugs</h3>
          <div className="stat-value">{data.statistics.open}</div>
        </div>
        <div className="stat-card">
          <h3>Fixed Bugs</h3>
          <div className="stat-value">{data.statistics.fixed}</div>
        </div>
        <div className="stat-card critical">
          <h3>Critical Bugs</h3>
          <div className="stat-value">{data.statistics.critical}</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Bug Trends</h3>
          <Line data={trendChartData} />
        </div>
        
        <div className="chart-container">
          <h3>Priority Distribution</h3>
          <Doughnut data={priorityChartData} />
        </div>
      </div>

      <div className="top-issues">
        <h3>Top Issues</h3>
        <div className="issues-list">
          {data.topIssues.map((issue, index) => (
            <div key={issue.id} className="issue-item">
              <div className="issue-rank">#{index + 1}</div>
              <div className="issue-details">
                <div className="issue-title">{issue.title}</div>
                <div className="issue-meta">
                  {issue.votes} votes • {issue.comments} comments • {issue.priority} priority
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BugRelayDashboard;
```

These integration examples provide comprehensive patterns for incorporating BugRelay into various types of applications and workflows. Each example includes error handling, best practices, and real-world considerations for production use.