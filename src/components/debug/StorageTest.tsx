import React, { useState } from 'react';
import { testStorageUpload, checkStorageConfiguration } from '../../utils/storageTest';
import { runFullDiagnostic } from '../../utils/firebaseChecker';

const StorageTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const runStorageTest = async () => {
    setLoading(true);
    setTestResult('Running storage test...');
    
    try {
      // Check configuration first
      const config = checkStorageConfiguration();
      console.log('Storage config:', config);
      
      if (!config.configured) {
        setTestResult('Storage not configured properly');
        return;
      }
      
      // Run upload test
      const result = await testStorageUpload();
      
      if (result.success) {
        setTestResult(`Success! File uploaded. URL: ${result.url}`);
      } else {
        setTestResult(`Failed: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      setTestResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostic = async () => {
    setLoading(true);
    setTestResult('Running full diagnostic... Check console for details.');
    
    try {
      const results = await runFullDiagnostic();
      setTestResult(`Diagnostic complete:\nConfig: ${results.configOk ? '✅' : '❌'}\nAuth: ${results.authOk ? '✅' : '❌'}\nStorage: ${results.storageOk ? '✅' : '❌'}\n\nCheck console for detailed logs.`);
    } catch (error: any) {
      setTestResult(`Diagnostic failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-md">
      <h3 className="font-bold mb-2">Storage Debug</h3>
      <button
        onClick={runStorageTest}
        disabled={loading}
        className="bg-blue-500 text-white px-3 py-1 rounded mb-2 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Storage'}
      </button>
      {testResult && (
        <div className="text-xs p-2 bg-gray-100 rounded">
          <pre className="whitespace-pre-wrap">{testResult}</pre>
        </div>
      )}
    </div>
  );
};

export default StorageTest;
