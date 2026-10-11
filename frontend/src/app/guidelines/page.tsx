import { InfoPage } from "@/components/info-page";
export default function Page() {
  return (
    <InfoPage title="Community guidelines">
      <p>
        Describe the problem clearly, include steps to reproduce it, and check
        for existing reports before posting. Share software versions and useful
        screenshots without personal data.
      </p>
      <p>
        Be respectful. Discuss the issue rather than the people involved. Do not
        post credentials, harassment, spam, or another person’s private
        information.
      </p>
      <p>
        Choose the security category for vulnerabilities. Those reports are
        private. Use the moderation flag on a report when it needs administrator
        attention.
      </p>
    </InfoPage>
  );
}
