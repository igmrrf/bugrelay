import { MainLayout } from "@/components/layout";
import { CompanyClaimContainer } from "@/components/companies/company-claim-container";

interface CompanyClaimPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CompanyClaimPage({
  params,
}: CompanyClaimPageProps) {
  const { id } = await params;

  return (
    <MainLayout>
      <div className="container py-8">
        <CompanyClaimContainer companyId={id} />
      </div>
    </MainLayout>
  );
}
