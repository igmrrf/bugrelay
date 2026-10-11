import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { SubmitScreen, BugListScreen } from "../src/components/bug-screens";
import { AuthScreen } from "../src/components/auth-screens";
import { SessionProvider } from "../src/components/session";
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ id: "report-id" }),
}));
vi.mock("next/script", () => ({ default: () => null }));
const user = {
  id: "user-id",
  email: "user@example.com",
  displayName: "Reporter",
  isAdmin: false,
  isEmailVerified: true,
  createdAt: "2026-01-01T00:00:00Z",
  companyMemberships: [],
};
let calls: { path: string; options: RequestInit }[] = [];
beforeEach(() => {
  calls = [];
  push.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, options: RequestInit = {}) => {
      calls.push({ path, options });
      if (path.endsWith("/auth/profile")) return Response.json(user);
      if (path.endsWith("/config"))
        return Response.json({ turnstileSiteKey: null, oauthProviders: [] });
      if (path.includes("/companies"))
        return Response.json({
          items: [],
          total: 0,
          page: 1,
          limit: 20,
          hasNextPage: false,
        });
      if (path.includes("search-duplicates"))
        return Response.json({ duplicates: [] });
      if (path === "/api/v1/bugs" && options.method === "POST")
        return Response.json({ id: "new-report" });
      if (path.includes("/auth/login")) return Response.json({ user });
      return Response.json({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasNextPage: false,
      });
    }),
  );
});
function mount(node: React.ReactNode) {
  render(<SessionProvider>{node}</SessionProvider>);
}
test("zero duplicate results never block submitting a new product", async () => {
  mount(<SubmitScreen />);
  await screen.findByLabelText("Application or product");
  fireEvent.change(screen.getByLabelText("Application or product"), {
    target: { value: "Brand new product" },
  });
  fireEvent.change(screen.getByLabelText("Report title"), {
    target: { value: "A new product crashes on login" },
  });
  fireEvent.change(screen.getByLabelText("Description"), {
    target: {
      value:
        "The application crashes immediately after I submit the login form.",
    },
  });
  fireEvent.click(screen.getByText("Check for similar reports"));
  await screen.findByText(
    "No similar reports found. Continue with your report.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Submit report" }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/bugs/new-report"));
  const call = calls.find(
    (c) => c.path === "/api/v1/bugs" && c.options.method === "POST",
  )!;
  expect(JSON.parse(String(call.options.body))).toMatchObject({
    applicationName: "Brand new product",
    visibility: "public",
  });
});
test("security category makes privacy explicit and submits private visibility", async () => {
  mount(<SubmitScreen />);
  await screen.findByLabelText("Category");
  fireEvent.change(screen.getByLabelText("Category"), {
    target: { value: "security" },
  });
  expect(screen.getByText(/Security reports are private/)).toBeInTheDocument();
  expect(screen.queryByLabelText("Visibility")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Application or product"), {
    target: { value: "Product" },
  });
  fireEvent.change(screen.getByLabelText("Report title"), {
    target: { value: "Private security report" },
  });
  fireEvent.change(screen.getByLabelText("Description"), {
    target: {
      value: "A restricted reproduction with sufficient details for the team.",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Submit report" }));
  await waitFor(() => expect(push).toHaveBeenCalled());
  expect(
    JSON.parse(
      String(
        calls.find(
          (c) => c.path === "/api/v1/bugs" && c.options.method === "POST",
        )!.options.body,
      ),
    ).visibility,
  ).toBe("private");
});
test("login uses camelCase session response and refreshes authoritative profile", async () => {
  mount(<AuthScreen mode="login" />);
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "user@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "Long password 123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  expect(calls.some((c) => c.path.includes("refresh"))).toBe(false);
  expect(window.localStorage.length).toBe(0);
});
test("empty search state offers a report path", async () => {
  mount(<BugListScreen />);
  await screen.findByText("Create the first report.");
  expect(
    screen.getByRole("link", { name: "Create the first report." }),
  ).toHaveAttribute("href", "/submit");
});
test("search, tag and vote sorting compose without discarding filters", async () => {
  mount(<BugListScreen />);
  await screen.findByText("Create the first report.");
  fireEvent.change(screen.getByLabelText("Search reports"), {
    target: { value: "login" },
  });
  fireEvent.change(screen.getByLabelText("Filter by tag"), {
    target: { value: "mobile & ui" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Search$/ }));
  fireEvent.change(screen.getByLabelText("Sort reports"), {
    target: { value: "votes" },
  });
  await waitFor(() =>
    expect(
      calls.some(
        (c) =>
          c.path.includes("q=login") &&
          c.path.includes("sort=votes") &&
          c.path.includes("tag=mobile%20%26%20ui"),
      ),
    ).toBe(true),
  );
});
