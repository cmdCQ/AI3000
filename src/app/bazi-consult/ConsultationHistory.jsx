import { useCallback } from 'react'
import { RecordsHistoryPage } from '../shared/RecordsHistoryPage.jsx'
import { deleteConsultation, listConsultations } from './api.js'

function normalize(response) {
  if (!Array.isArray(response.consultations)) throw new Error('咨询记录格式异常')
  return {
    records: response.consultations.map(item => ({
      id: item.id,
      title: item.title || '未命名咨询',
      meta: [item.chartName, new Date(item.updatedAt || item.createdAt).toLocaleString()].filter(Boolean).join(' · '),
      href: `/bazi-consult/?consultationId=${encodeURIComponent(item.id)}`,
      icon: '☰',
    })),
    nextBefore: response.nextBefore || null,
  }
}

export default function ConsultationHistory({ chartId }) {
  const loadRecords = useCallback(async signal => normalize(await listConsultations(chartId, signal)), [chartId])
  const loadMoreRecords = useCallback(async (before, signal) => normalize(await listConsultations(chartId, signal, before)), [chartId])
  return <RecordsHistoryPage title="咨询记录" backHref="/select-chart/?type=charts"
    loadRecords={loadRecords} loadMoreRecords={loadMoreRecords} deleteRecord={deleteConsultation}
    emptyTitle="暂无咨询记录" emptyDescription="从命盘卡片发起咨询，首次发送问题后会保存记录。"
    emptyAction="选择命盘" searchPlaceholder="搜索咨询或命盘…" noResultsText="没有匹配的咨询"
    loginTitle="登录后查看咨询记录" loginDescription="查看、继续和管理你自己的咨询记录。" />
}
