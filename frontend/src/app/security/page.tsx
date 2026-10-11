import { InfoPage } from "@/components/info-page";
export default function Page() {
  return (
    <InfoPage title="Responsible security reports">
      <p>
        Choose “Security vulnerability” when submitting a report. Security
        reports and attachments are accessible only to their reporter, BugRelay
        administrators, and members of the verified assigned company.
      </p>
      <p>
        An unassigned private report is visible only to the reporter and
        BugRelay administrators. Company verification does not imply that a
        company has agreed to a response deadline or a bounty.
      </p>
      <p>
        Never include working passwords, API keys, session cookies, personal
        records, or unnecessary sensitive data. Share a minimal reproduction. Do
        not exploit a vulnerability beyond what you are authorized to test.
      </p>
      <p>
        Report a problem with BugRelay through a private security report for the
        BugRelay application.
      </p>
    </InfoPage>
  );
}
