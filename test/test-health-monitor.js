#!/usr/bin/env node

/**
 * CookCam Test Health Monitor
 * 
 * Automated test health monitoring and reporting system
 * Tracks test performance, identifies flaky tests, and generates health reports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TestHealthMonitor {
  constructor() {
    this.config = {
      testSuites: [
        { name: 'backend-unit', command: 'cd backend/api && npm test', threshold: 30000 },
        { name: 'mobile-unit', command: 'cd mobile/CookCam && npm test', threshold: 45000 },
        { name: 'integration', command: 'npm run test:integration', threshold: 180000 },
        { name: 'e2e-ios', command: 'npm run test:e2e ios', threshold: 900000 },
      ],
      healthMetrics: {
        passRateThreshold: 99.5,
        executionTimeThreshold: 1200000, // 20 minutes
        flakyTestThreshold: 0.1,
        coverageThreshold: 87,
      },
      reportPath: './test/reports',
      historyPath: './test/history'
    };
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.config.reportPath, this.config.historyPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async runHealthCheck() {
    console.log('🔍 Starting CookCam Test Health Check...\n');
    
    const startTime = Date.now();
    const results = {
      timestamp: new Date().toISOString(),
      overall: { status: 'unknown', issues: [] },
      suites: [],
      metrics: {},
      recommendations: []
    };

    // Run each test suite
    for (const suite of this.config.testSuites) {
      console.log(`📋 Running ${suite.name} tests...`);
      const suiteResult = await this.runTestSuite(suite);
      results.suites.push(suiteResult);
      
      if (!suiteResult.passed) {
        results.overall.issues.push(`${suite.name} tests failed`);
      }
      
      if (suiteResult.duration > suite.threshold) {
        results.overall.issues.push(`${suite.name} tests too slow (${suiteResult.duration}ms)`);
      }
    }

    // Calculate overall metrics
    results.metrics = this.calculateMetrics(results.suites);
    
    // Generate recommendations
    results.recommendations = this.generateRecommendations(results);
    
    // Determine overall status
    results.overall.status = results.overall.issues.length === 0 ? 'healthy' : 'issues';
    
    // Save results
    await this.saveResults(results);
    
    // Generate report
    this.generateReport(results);
    
    // Check for alerts
    this.checkAlerts(results);
    
    const totalTime = Date.now() - startTime;
    console.log(`\n✅ Health check completed in ${totalTime}ms`);
    
    return results;
  }

  async runTestSuite(suite) {
    const startTime = Date.now();
    let result = {
      name: suite.name,
      passed: false,
      duration: 0,
      coverage: null,
      failures: [],
      performance: {}
    };

    try {
      const output = execSync(suite.command, { 
        encoding: 'utf8',
        timeout: suite.threshold * 2,
        stdio: 'pipe'
      });
      
      result.duration = Date.now() - startTime;
      result.passed = true;
      result.coverage = this.extractCoverage(output);
      result.performance = this.extractPerformanceMetrics(output);
      
      console.log(`  ✅ ${suite.name}: PASSED (${result.duration}ms)`);
      
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.passed = false;
      result.failures = this.extractFailures(error.stdout || error.message);
      
      console.log(`  ❌ ${suite.name}: FAILED (${result.duration}ms)`);
      console.log(`     Failures: ${result.failures.length}`);
    }

    return result;
  }

  extractCoverage(output) {
    // Extract coverage from Jest output
    const coverageMatch = output.match(/All files\s*\|\s*([\d.]+)/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : null;
  }

  extractPerformanceMetrics(output) {
    // Extract test timing information
    const metrics = {};
    
    // Extract test suite times
    const suiteTimeMatch = output.match(/Test Suites: .* (\d+\.?\d*s)/);
    if (suiteTimeMatch) {
      metrics.suiteTime = parseFloat(suiteTimeMatch[1]) * 1000;
    }
    
    // Extract slow tests
    const slowTests = [];
    const slowTestRegex = /(\w+\.test\.[jt]s) \((\d+\.?\d*s)\)/g;
    let match;
    while ((match = slowTestRegex.exec(output)) !== null) {
      if (parseFloat(match[2]) > 5) { // Tests slower than 5 seconds
        slowTests.push({ file: match[1], time: match[2] });
      }
    }
    metrics.slowTests = slowTests;
    
    return metrics;
  }

  extractFailures(errorOutput) {
    const failures = [];
    
    // Extract Jest failure information
    const failureBlocks = errorOutput.split('FAIL ');
    
    failureBlocks.forEach(block => {
      if (block.includes('●')) {
        const lines = block.split('\n');
        const testFile = lines[0];
        const failureLines = lines.filter(line => line.includes('●'));
        
        failureLines.forEach(failure => {
          failures.push({
            file: testFile,
            test: failure.trim(),
            error: this.extractErrorMessage(block)
          });
        });
      }
    });
    
    return failures;
  }

  extractErrorMessage(block) {
    const errorMatch = block.match(/Error: (.+?)(?:\n|\r|\r\n)/);
    return errorMatch ? errorMatch[1] : 'Unknown error';
  }

  calculateMetrics(suites) {
    const totalSuites = suites.length;
    const passedSuites = suites.filter(s => s.passed).length;
    const passRate = (passedSuites / totalSuites) * 100;
    
    const totalDuration = suites.reduce((sum, s) => sum + s.duration, 0);
    const avgDuration = totalDuration / totalSuites;
    
    const coverages = suites.map(s => s.coverage).filter(c => c !== null);
    const avgCoverage = coverages.length > 0 
      ? coverages.reduce((sum, c) => sum + c, 0) / coverages.length 
      : null;
    
    const totalFailures = suites.reduce((sum, s) => sum + s.failures.length, 0);
    
    return {
      passRate: parseFloat(passRate.toFixed(2)),
      avgDuration: Math.round(avgDuration),
      totalDuration: totalDuration,
      avgCoverage: avgCoverage ? parseFloat(avgCoverage.toFixed(2)) : null,
      totalFailures,
      suiteCount: totalSuites
    };
  }

  generateRecommendations(results) {
    const recommendations = [];
    const metrics = results.metrics;
    const config = this.config.healthMetrics;
    
    // Pass rate recommendations
    if (metrics.passRate < config.passRateThreshold) {
      recommendations.push({
        type: 'critical',
        category: 'reliability',
        message: `Pass rate (${metrics.passRate}%) is below threshold (${config.passRateThreshold}%)`,
        action: 'Investigate and fix failing tests immediately'
      });
    }
    
    // Performance recommendations
    if (metrics.totalDuration > config.executionTimeThreshold) {
      recommendations.push({
        type: 'warning',
        category: 'performance',
        message: `Total execution time (${Math.round(metrics.totalDuration/1000)}s) exceeds threshold (${config.executionTimeThreshold/1000}s)`,
        action: 'Optimize slow tests or consider parallel execution'
      });
    }
    
    // Coverage recommendations
    if (metrics.avgCoverage && metrics.avgCoverage < config.coverageThreshold) {
      recommendations.push({
        type: 'warning',
        category: 'coverage',
        message: `Average coverage (${metrics.avgCoverage}%) is below threshold (${config.coverageThreshold}%)`,
        action: 'Add tests to increase coverage'
      });
    }
    
    // Failure recommendations
    if (metrics.totalFailures > 0) {
      recommendations.push({
        type: 'error',
        category: 'failures',
        message: `${metrics.totalFailures} test failures detected`,
        action: 'Review and fix failing tests'
      });
    }
    
    // Performance recommendations for slow tests
    results.suites.forEach(suite => {
      if (suite.performance.slowTests && suite.performance.slowTests.length > 0) {
        recommendations.push({
          type: 'info',
          category: 'performance',
          message: `${suite.name} has ${suite.performance.slowTests.length} slow tests`,
          action: `Review and optimize: ${suite.performance.slowTests.map(t => t.file).join(', ')}`
        });
      }
    });
    
    return recommendations;
  }

  async saveResults(results) {
    // Save current results
    const currentPath = path.join(this.config.reportPath, 'current-health.json');
    fs.writeFileSync(currentPath, JSON.stringify(results, null, 2));
    
    // Save to history
    const historyPath = path.join(
      this.config.historyPath, 
      `health-${new Date().toISOString().split('T')[0]}.json`
    );
    fs.writeFileSync(historyPath, JSON.stringify(results, null, 2));
    
    // Update trend data
    this.updateTrendData(results);
  }

  updateTrendData(results) {
    const trendPath = path.join(this.config.reportPath, 'trend-data.json');
    let trendData = { entries: [] };
    
    if (fs.existsSync(trendPath)) {
      trendData = JSON.parse(fs.readFileSync(trendPath, 'utf8'));
    }
    
    // Add current entry
    trendData.entries.push({
      date: results.timestamp,
      passRate: results.metrics.passRate,
      avgDuration: results.metrics.avgDuration,
      avgCoverage: results.metrics.avgCoverage,
      totalFailures: results.metrics.totalFailures
    });
    
    // Keep last 30 entries
    if (trendData.entries.length > 30) {
      trendData.entries = trendData.entries.slice(-30);
    }
    
    fs.writeFileSync(trendPath, JSON.stringify(trendData, null, 2));
  }

  generateReport(results) {
    const reportPath = path.join(this.config.reportPath, 'health-report.md');
    const report = this.createMarkdownReport(results);
    fs.writeFileSync(reportPath, report);
    console.log(`📊 Health report generated: ${reportPath}`);
  }

  createMarkdownReport(results) {
    const status = results.overall.status === 'healthy' ? '✅' : '⚠️';
    const timestamp = new Date(results.timestamp).toLocaleString();
    
    let report = `# CookCam Test Health Report ${status}\n\n`;
    report += `**Generated**: ${timestamp}\n`;
    report += `**Overall Status**: ${results.overall.status.toUpperCase()}\n\n`;
    
    // Executive Summary
    report += `## Executive Summary\n\n`;
    report += `- **Pass Rate**: ${results.metrics.passRate}% (Target: ≥${this.config.healthMetrics.passRateThreshold}%)\n`;
    report += `- **Total Duration**: ${Math.round(results.metrics.totalDuration/1000)}s (Target: ≤${this.config.healthMetrics.executionTimeThreshold/1000}s)\n`;
    
    if (results.metrics.avgCoverage) {
      report += `- **Average Coverage**: ${results.metrics.avgCoverage}% (Target: ≥${this.config.healthMetrics.coverageThreshold}%)\n`;
    }
    
    report += `- **Total Failures**: ${results.metrics.totalFailures}\n\n`;
    
    // Test Suite Results
    report += `## Test Suite Results\n\n`;
    report += `| Suite | Status | Duration | Coverage | Failures |\n`;
    report += `|-------|--------|----------|----------|----------|\n`;
    
    results.suites.forEach(suite => {
      const status = suite.passed ? '✅' : '❌';
      const duration = `${Math.round(suite.duration/1000)}s`;
      const coverage = suite.coverage ? `${suite.coverage}%` : 'N/A';
      const failures = suite.failures.length || '0';
      
      report += `| ${suite.name} | ${status} | ${duration} | ${coverage} | ${failures} |\n`;
    });
    
    report += `\n`;
    
    // Issues
    if (results.overall.issues.length > 0) {
      report += `## Issues Detected\n\n`;
      results.overall.issues.forEach(issue => {
        report += `- ⚠️ ${issue}\n`;
      });
      report += `\n`;
    }
    
    // Recommendations
    if (results.recommendations.length > 0) {
      report += `## Recommendations\n\n`;
      
      const critical = results.recommendations.filter(r => r.type === 'critical');
      const warnings = results.recommendations.filter(r => r.type === 'warning');
      const errors = results.recommendations.filter(r => r.type === 'error');
      const info = results.recommendations.filter(r => r.type === 'info');
      
      if (critical.length > 0) {
        report += `### 🚨 Critical\n`;
        critical.forEach(rec => {
          report += `- **${rec.message}**\n  *Action: ${rec.action}*\n\n`;
        });
      }
      
      if (errors.length > 0) {
        report += `### ❌ Errors\n`;
        errors.forEach(rec => {
          report += `- **${rec.message}**\n  *Action: ${rec.action}*\n\n`;
        });
      }
      
      if (warnings.length > 0) {
        report += `### ⚠️ Warnings\n`;
        warnings.forEach(rec => {
          report += `- **${rec.message}**\n  *Action: ${rec.action}*\n\n`;
        });
      }
      
      if (info.length > 0) {
        report += `### ℹ️ Information\n`;
        info.forEach(rec => {
          report += `- **${rec.message}**\n  *Action: ${rec.action}*\n\n`;
        });
      }
    }
    
    // Detailed Failures
    const failedSuites = results.suites.filter(s => !s.passed);
    if (failedSuites.length > 0) {
      report += `## Detailed Failure Analysis\n\n`;
      
      failedSuites.forEach(suite => {
        report += `### ${suite.name}\n\n`;
        suite.failures.forEach(failure => {
          report += `**File**: ${failure.file}\n`;
          report += `**Test**: ${failure.test}\n`;
          report += `**Error**: ${failure.error}\n\n`;
        });
      });
    }
    
    return report;
  }

  checkAlerts(results) {
    const config = this.config.healthMetrics;
    const alerts = [];
    
    // Critical alerts
    if (results.metrics.passRate < config.passRateThreshold) {
      alerts.push(`🚨 CRITICAL: Test pass rate dropped to ${results.metrics.passRate}%`);
    }
    
    if (results.metrics.totalFailures > 0) {
      alerts.push(`❌ ERROR: ${results.metrics.totalFailures} test failures detected`);
    }
    
    // Warning alerts
    if (results.metrics.totalDuration > config.executionTimeThreshold) {
      const minutes = Math.round(results.metrics.totalDuration / 60000);
      alerts.push(`⚠️ WARNING: Tests taking too long (${minutes} minutes)`);
    }
    
    if (results.metrics.avgCoverage && results.metrics.avgCoverage < config.coverageThreshold) {
      alerts.push(`⚠️ WARNING: Coverage dropped to ${results.metrics.avgCoverage}%`);
    }
    
    // Log alerts
    if (alerts.length > 0) {
      console.log('\n🚨 ALERTS DETECTED:');
      alerts.forEach(alert => console.log(`  ${alert}`));
      
      // In a real system, send alerts via Slack, email, etc.
      this.sendAlerts(alerts);
    } else {
      console.log('\n✅ No alerts - all systems healthy');
    }
  }

  sendAlerts(alerts) {
    // In production, implement actual alerting:
    // - Slack webhook
    // - Email notifications  
    // - PagerDuty integration
    // - GitHub issue creation
    
    console.log('📧 Alerts would be sent to configured channels');
  }

  // Flaky test detection
  async detectFlakyTests() {
    console.log('🔍 Detecting flaky tests...');
    
    const historyFiles = fs.readdirSync(this.config.historyPath)
      .filter(f => f.startsWith('health-'))
      .sort()
      .slice(-7); // Last 7 days
    
    const testResults = {};
    
    historyFiles.forEach(file => {
      const data = JSON.parse(fs.readFileSync(
        path.join(this.config.historyPath, file), 'utf8'
      ));
      
      data.suites.forEach(suite => {
        suite.failures.forEach(failure => {
          const testKey = `${failure.file}::${failure.test}`;
          if (!testResults[testKey]) {
            testResults[testKey] = { runs: 0, failures: 0 };
          }
          testResults[testKey].failures++;
        });
      });
    });
    
    const flakyTests = Object.entries(testResults)
      .filter(([test, stats]) => {
        const failureRate = stats.failures / historyFiles.length;
        return failureRate > 0 && failureRate < 1; // Sometimes passes, sometimes fails
      })
      .map(([test, stats]) => ({
        test,
        failureRate: (stats.failures / historyFiles.length * 100).toFixed(1)
      }));
    
    if (flakyTests.length > 0) {
      console.log('\n🎭 Flaky tests detected:');
      flakyTests.forEach(test => {
        console.log(`  - ${test.test} (${test.failureRate}% failure rate)`);
      });
    } else {
      console.log('\n✅ No flaky tests detected');
    }
    
    return flakyTests;
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new TestHealthMonitor();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
      monitor.runHealthCheck()
        .then(() => process.exit(0))
        .catch(err => {
          console.error('Health check failed:', err);
          process.exit(1);
        });
      break;
      
    case 'flaky':
      monitor.detectFlakyTests()
        .then(() => process.exit(0))
        .catch(err => {
          console.error('Flaky test detection failed:', err);
          process.exit(1);
        });
      break;
      
    default:
      console.log(`
CookCam Test Health Monitor

Usage:
  node test-health-monitor.js check  - Run full health check
  node test-health-monitor.js flaky  - Detect flaky tests

Reports are generated in: ./test/reports/
History is stored in: ./test/history/
      `);
      process.exit(0);
  }
}

module.exports = TestHealthMonitor;