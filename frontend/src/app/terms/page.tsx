import { InfoPage } from "@/components/info-page";
export default function Page() {
  return (
    <InfoPage title="Using BugRelay">
      <p>
        Use BugRelay to report software issues you are authorized to
        investigate. Submit only content you have the right to share, and follow
        the community guidelines.
      </p>
      <p>
        You retain ownership of your content and permit BugRelay to store and
        display it according to the visibility you select. Public reports are
        available to everyone. Security reports remain private.
      </p>
      <p>
        BugRelay administrators may remove abusive content or suspend accounts.
        Company verification establishes access for a team; it does not
        guarantee a fix, support relationship, bounty, or response time.
      </p>
      <p>
        The service is provided as available. Keep your own copy of important
        information and do not use BugRelay as your only emergency security
        contact.
      </p>
    </InfoPage>
  );
}
