import { MainLayout } from "@/components/layout";
import { BugDetailContainer } from "@/components/bugs/bug-detail-container";

interface BugDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BugDetailPage({ params }: BugDetailPageProps) {
  const { id } = await params;

  return (
    <MainLayout>
      <div className="container max-w-4xl py-8">
        <BugDetailContainer bugId={id} />
      </div>
    </MainLayout>
  );
}
