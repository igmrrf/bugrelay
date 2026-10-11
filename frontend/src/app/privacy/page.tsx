import { InfoPage } from "@/components/info-page";
export default function Page() {
  return (
    <InfoPage title="Privacy">
      <p>
        BugRelay stores account email addresses, display names, password hashes,
        sessions, reports, comments, votes, company memberships, attachments and
        administrative audit records to provide the service.
      </p>
      <p>
        Public reports, comments and display names are visible to everyone.
        Private reports are limited to their reporter, BugRelay administrators
        and verified assigned-company members. Your email is visible to you,
        platform administrators and authorized administrators or members of a
        company team you join.
      </p>
      <p>
        The service uses essential session cookies. Authentication and
        email-action tokens are stored as hashes. Transactional email and
        application storage are provided through Cloudflare. Avoid placing
        personal or confidential information in public reports.
      </p>
      <p>
        Deleted reports are removed from application access; administrative
        records and backups may retain them for operational recovery. Contact
        the service operator through a private BugRelay report for an
        account-data request.
      </p>
    </InfoPage>
  );
}
