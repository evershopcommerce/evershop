import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { MessageSquare } from 'lucide-react';
import React from 'react';

export default function Survey() {
  const surveyUrl = 'https://evershop.io/admin-survey';

  const handleSurveyClick = () => {
    window.open(surveyUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={handleSurveyClick}
        size="default"
        className="shadow-lg hover:shadow-xl transition-shadow gap-2"
        title={_('Take our survey')}
      >
        <MessageSquare className="size-4" />
        {_('Give Feedback')}
      </Button>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 999
};
