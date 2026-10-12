import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendManualEmail } from "@/lib/emailService";

describe("emailService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should throw error if no recipients provided", async () => {
    await expect(
      sendManualEmail({
        type: "announcement",
        recipients: [],
        event: { name: "Test Hackathon" },
      })
    ).rejects.toThrow("No recipients specified");
  });

  it("should send manual announcement email successfully", async () => {
    // Mock global fetch
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, sentCount: 1 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendManualEmail({
      type: "announcement",
      recipients: [{ name: "Alex", email: "alex@college.edu" }],
      subject: "Hackathon Schedule Update",
      message: "Here is the schedule...",
      event: {
        name: "AI Innovators Hackathon",
        event_date: "2026-11-20T10:00:00Z",
        location_type: "physical",
        location_value: "Tech Campus Hall A",
      },
      hostName: "Crack Admin",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/send-email");
    const body = JSON.parse(options.body);
    expect(body.type).toBe("announcement");
    expect(body.emails).toContain("alex@college.edu");
    expect(body.subject).toBe("Hackathon Schedule Update");
    expect(body.eventTitle).toBe("AI Innovators Hackathon");
    expect(result.success).toBe(true);
    expect(result.sentCount).toBe(1);
  });
});
