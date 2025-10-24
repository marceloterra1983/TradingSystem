import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { PlaceholderSection } from '../ui/placeholder-section';
import { Calendar } from 'lucide-react';

export function RoadmapPage() {
  const sections = [
    {
      id: 'roadmap-timeline',
      content: (
        <PlaceholderSection
          cardId="roadmap-timeline"
          title="Timeline"
          description="Timeline de features planejadas: milestones, releases, prioridades."
          icon={<Calendar className="w-5 h-5 text-purple-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="roadmap"
      title="Product Roadmap"
      subtitle="Features timeline and milestones"
      sections={sections}
      defaultColumns={1}
    />
  );
}
