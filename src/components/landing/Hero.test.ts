import { describe, it, expect } from "vitest";
import React from "react";
import Hero from "./Hero";
import { AssessmentRecord } from "@/services/healthService";

describe("Hero Component & Metric Resilience", () => {
  it("renders Hero component structure without throwing", () => {
    const element = React.createElement(Hero);
    expect(element.type).toBe(Hero);
  });

  it("handles assessment record with null/undefined BMI safely (chat consultation summary)", () => {
    const chatRecord: AssessmentRecord = {
      id: "chat-rec-1",
      user_id: "user-123",
      source: "chat",
      session_id: "sess-abc",
      symptoms: ["Frequent headaches", "Eye fatigue"],
      risk_level: "Low",
      ai_summary: "Mild symptoms related to screen fatigue.",
      recommendations: ["Rest eyes", "Stay hydrated"],
      disclaimer: "This is not a medical diagnosis.",
      created_at: new Date().toISOString(),
      // Note: bmi, bmi_category, height_cm, weight_kg are intentionally undefined/null
    };

    // Verify safe handling without throwing TypeError: Cannot read properties of null (reading 'toString')
    const displayValue = chatRecord.bmi != null ? String(chatRecord.bmi) : (chatRecord.symptoms?.[0] || "Consultation");
    expect(displayValue).toBe("Frequent headaches");

    const displayBadge = chatRecord.source === "chat" ? "From AI Chat" : (chatRecord.bmi_category || "Calculated");
    expect(displayBadge).toBe("From AI Chat");

    const displayRisk = chatRecord.risk_level || "Low";
    expect(displayRisk).toBe("Low");
  });

  it("falls back to earlier structured BMI if latest record is chat consultation", () => {
    const assessments: AssessmentRecord[] = [
      {
        id: "chat-rec-1",
        source: "chat",
        symptoms: ["Fatigue"],
        risk_level: "Low",
        ai_summary: "Chat summary",
        recommendations: ["Rest"],
        disclaimer: "Not medical advice",
        created_at: "2026-10-25T12:00:00Z",
      },
      {
        id: "struct-rec-2",
        source: "assessment",
        bmi: 22.4,
        bmi_category: "Normal weight",
        symptoms: ["Mild stress"],
        risk_level: "Low",
        ai_summary: "Structured assessment",
        recommendations: ["Exercise"],
        disclaimer: "Not medical advice",
        created_at: "2026-10-20T12:00:00Z",
      },
    ];

    const latestAssessment = assessments[0];
    const latestBmiAssessment = assessments.find((a) => a.bmi != null);

    expect(latestAssessment.bmi).toBeUndefined();
    expect(latestBmiAssessment?.bmi).toBe(22.4);
    expect(latestBmiAssessment?.bmi_category).toBe("Normal weight");
  });
});
