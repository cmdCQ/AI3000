import React from 'react';
import { createRoot } from 'react-dom/client';
import { RecordsHistoryPage } from '../shared/RecordsHistoryPage.jsx';
import { createDivinationRecords } from '../shared/divinationRecords.js';
import './history.css';

const records = createDivinationRecords('liuyao');
createRoot(document.getElementById('root')).render(
  <RecordsHistoryPage title="排盘记录" backHref="/liuyao/" {...records} />
);
