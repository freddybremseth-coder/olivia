import React from 'react';
import TraceabilityBatchesOliviaView from './TraceabilityBatchesOliviaView';

const TraceabilityBatchesView: React.FC<{
  initialBatchId?: string | null;
  onContextConsumed?: () => void;
}> = ({ initialBatchId, onContextConsumed }) => {
  return <TraceabilityBatchesOliviaView initialBatchId={initialBatchId} onContextConsumed={onContextConsumed} />;
};

export default TraceabilityBatchesView;
