/*
  Copyright (c) Microsoft Corporation.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import type { TestCase, TestCaseSummary, TestFile, TestFileSummary } from './types';
import * as React from 'react';
import './colors.css';
import './common.css';
import { Filter } from './filter';
import type { LoadedReport } from './loadedReport';
import './reportView.css';
import './reportTreeView.css';
import { TestCaseView } from './testCaseView';
import './theme.css';
import { useSetting } from '@web/uiUtils';

declare global {
  interface Window {
    playwrightReportBase64?: string;
  }
}

// ── Tree node types ──────────────────────────────────────────────────────────

type TreeNode = {
  id: string;
  label: string;
  kind: 'folder' | 'describe' | 'test';
  outcome?: TestCaseSummary['outcome'];
  testId?: string;
  children: TreeNode[];
};

function buildTree(files: TestFileSummary[]): TreeNode {
  const root: TreeNode = { id: '__root__', label: '', kind: 'folder', children: [] };
  const nodeMap = new Map<string, TreeNode>();

  const getOrCreate = (parent: TreeNode, id: string, label: string, kind: 'folder' | 'describe'): TreeNode => {
    const existing = nodeMap.get(id);
    if (existing) return existing;
    const node: TreeNode = { id, label, kind, children: [] };
    parent.children.push(node);
    nodeMap.set(id, node);
    return node;
  };

  for (const file of files) {
    // Build folder path — skip the filename (.spec.ts)
    const parts = file.fileName.replace(/\\/g, '/').split('/');
    const folderParts = parts.length > 1 ? parts.slice(0, -1) : parts;

    let folderNode = root;
    let folderPath = '';
    for (const part of folderParts) {
      folderPath += '/' + part;
      folderNode = getOrCreate(folderNode, 'folder:' + folderPath, part, 'folder');
    }

    // Build describe + test nodes
    for (const test of file.tests) {
      let descNode = folderNode;
      let describePath = folderPath;
      for (const desc of test.path) {
        describePath += '/' + desc;
        descNode = getOrCreate(descNode, 'describe:' + describePath, desc, 'describe');
      }
      descNode.children.push({
        id: test.testId,
        label: test.title,
        kind: 'test',
        outcome: test.outcome,
        testId: test.testId,
        children: [],
      });
    }
  }

  return root;
}

// ── Tree panel ───────────────────────────────────────────────────────────────

const ReportTreePanel: React.FC<{
  files: TestFileSummary[];
  selectedTestId: string | null;
  onSelect: (testId: string) => void;
}> = ({ files, selectedTestId, onSelect }) => {
  const tree = React.useMemo(() => buildTree(files), [files]);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderNode = (node: TreeNode, depth: number): React.JSX.Element => {
    const indent = depth * 14 + 8;

    if (node.kind === 'test') {
      return (
        <div
          key={node.id}
          className={`report-tree-test outcome-${node.outcome ?? 'skipped'}${selectedTestId === node.testId ? ' selected' : ''}`}
          style={{ paddingLeft: indent }}
          onClick={() => node.testId && onSelect(node.testId)}
        >
          <div className='report-tree-test-dot' />
          <span className='report-tree-test-title'>{node.label}</span>
        </div>
      );
    }

    const isOpen = !collapsed.has(node.id);
    return (
      <div key={node.id}>
        <div
          className='report-tree-group-header'
          style={{ paddingLeft: indent }}
          onClick={() => toggle(node.id)}
        >
          <span className='report-tree-chevron'>{isOpen ? '▾' : '▸'}</span>
          <span className='report-tree-folder-icon'>{node.kind === 'folder' ? '📁' : ''}</span>
          <span>{node.label}</span>
        </div>
        {isOpen && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className='report-tree-panel'>
      {tree.children.map(child => renderNode(child, 0))}
    </div>
  );
};

// ── Main report view ─────────────────────────────────────────────────────────

export const ReportView: React.FC<{
  report: LoadedReport | undefined,
}> = ({ report }) => {
  const [filterText] = React.useState('');
  const [mergeFiles] = useSetting('mergeFiles', false);
  const [selectedTestId, setSelectedTestId] = React.useState<string | null>(null);
  const [loadedTest, setLoadedTest] = React.useState<TestCase | 'loading' | 'not-found' | null>(null);

  const filter = React.useMemo(() => Filter.parse(filterText), [filterText]);

  const files = React.useMemo(() => {
    if (!report) return [];
    const allFiles = report.json().files;
    if (mergeFiles) return allFiles;
    return allFiles.map(f => ({ ...f, tests: f.tests.filter(t => filter.matches(t)) })).filter(f => f.tests.length > 0);
  }, [report, filter, mergeFiles]);

  const testIdToFileIdMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const file of report?.json().files || [])
      for (const test of file.tests) map.set(test.testId, file.fileId);
    return map;
  }, [report]);

  React.useEffect(() => {
    if (!selectedTestId || !report) {
      setLoadedTest(null);
      return;
    }
    setLoadedTest('loading');
    (async () => {
      const fileId = testIdToFileIdMap.get(selectedTestId);
      if (!fileId) { setLoadedTest('not-found'); return; }
      const file = await report.entry(`${fileId}.json`) as TestFile;
      setLoadedTest(file?.tests.find(t => t.testId === selectedTestId) || 'not-found');
    })();
  }, [selectedTestId, report, testIdToFileIdMap]);

  React.useEffect(() => {
    const title = report?.json()?.options.title;
    document.title = title || 'Playwright Test Report';
  }, [report]);

  return (
    <div className='report-split'>
      <ReportTreePanel
        files={files}
        selectedTestId={selectedTestId}
        onSelect={setSelectedTestId}
      />
      <div className='report-detail-panel'>
        {!selectedTestId && (
          <div className='report-detail-empty'>Pilih test untuk melihat detail</div>
        )}
        {selectedTestId && loadedTest === 'loading' && (
          <div className='report-detail-empty'>Memuat…</div>
        )}
        {selectedTestId && loadedTest === 'not-found' && (
          <div className='report-detail-empty'>Test tidak ditemukan</div>
        )}
        {loadedTest && loadedTest !== 'loading' && loadedTest !== 'not-found' && (
          <TestCaseView
            report={report!}
            test={loadedTest}
            run={0}
            next={undefined}
            prev={undefined}
          />
        )}
      </div>
    </div>
  );
};
