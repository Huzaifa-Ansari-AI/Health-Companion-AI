import { describe, it, expect } from "vitest";
import {
  generateDemoHealthAnalysis,
  analyzeHealthAssessment,
} from "./healthService";
import { validateHealthAnalysisOutput } from "@/lib/aiValidation";
import type { AssessmentRecord } from "./healthService";

describe("Phase 4: LLM Dynamic Health Risk Assessment", () => {
  describe("validateHealthAnalysisOutput", () => {
    it("validates a well-formed health analysis payload", () => {
      const valid = {
        overall_risk_level: "Medium",
        summary: "Based on recorded vitals, your metabolic indicator is moderate.",
        risks: [
          {
            condition: "Cardiopulmonary & Mucosal Health",
            risk_level: "High",
            rationale: "Active nicotine exposure increases cardiovascular strain.",
            icon_name: "Flame",
          },
          {
            condition: "Metabolic Strain",
            risk_level: "Medium",
            rationale: "BMI of 27 indicates slight excess weight.",
            icon_name: "Scale",
          },
        ],
        recommendations: [
          "Seek professional cessation guidance.",
          "Introduce 30 minutes of daily walking.",
        ],
        disclaimer: "This is not a medical diagnosis. Please consult a qualified healthcare professional.",
      };

      const result = validateHealthAnalysisOutput(valid);
      expect(result).not.toBeNull();
      expect(result?.overall_risk_level).toBe("Medium");
      expect(result?.risks).toHaveLength(2);
      expect(result?.risks[0].risk_level).toBe("High");
    });

    it("rejects invalid risk levels not in Low/Medium/High", () => {
      const invalid = {
        overall_risk_level: "Extreme", // Invalid
        summary: "Summary text",
        risks: [],
        recommendations: [],
        disclaimer: "This is not a medical diagnosis.",
      };

      const result = validateHealthAnalysisOutput(invalid);
      expect(result).toBeNull();
    });

    it("rejects payload missing disclaimer or summary", () => {
      const invalid = {
        overall_risk_level: "Low",
        risks: [],
        recommendations: [],
      };

      const result = validateHealthAnalysisOutput(invalid);
      expect(result).toBeNull();
    });
  });

  describe("generateDemoHealthAnalysis (Deterministic Generator)", () => {
    it("produces High risk Cardiopulmonary card for tobacco and regional oral substances", () => {
      const record: AssessmentRecord = {
        height_cm: 175,
        weight_kg: 70,
        bmi: 22.9,
        bmi_category: "Normal weight",
        symptoms: [],
        risk_level: "Low",
        ai_summary: "",
        recommendations: [],
        disclaimer: "This is not a medical diagnosis.",
        lifestyle_data: {
          smoking: false,
          harmful_substances: ["Gutka", "Nicotine pouches (e.g. ZYN, VELO)"],
        },
      };

      const analysis = generateDemoHealthAnalysis(record);
      expect(analysis.overall_risk_level).toBe("High");
      const substanceRisk = analysis.risks.find((r) => r.condition.includes("Cardiopulmonary"));
      expect(substanceRisk).toBeDefined();
      expect(substanceRisk?.risk_level).toBe("High");
      expect(substanceRisk?.rationale).toContain("Gutka");
      expect(substanceRisk?.rationale).toContain("Nicotine pouches");
    });

    it("generates High risk Metabolic Health card for BMI in Obesity range", () => {
      const record: AssessmentRecord = {
        height_cm: 170,
        weight_kg: 95,
        bmi: 32.9,
        bmi_category: "Obesity",
        symptoms: [],
        risk_level: "Low",
        ai_summary: "",
        recommendations: [],
        disclaimer: "This is not a medical diagnosis.",
        lifestyle_data: {},
      };

      const analysis = generateDemoHealthAnalysis(record);
      expect(analysis.overall_risk_level).toBe("High");
      const metabolicRisk = analysis.risks.find((r) => r.condition.includes("Metabolic Health"));
      expect(metabolicRisk).toBeDefined();
      expect(metabolicRisk?.risk_level).toBe("High");
    });

    it("evaluates family history of diabetes into Type 2 Diabetes Predisposition card", () => {
      const record: AssessmentRecord = {
        height_cm: 170,
        weight_kg: 65,
        bmi: 22.5,
        bmi_category: "Normal weight",
        symptoms: [],
        risk_level: "Low",
        ai_summary: "",
        recommendations: [],
        disclaimer: "This is not a medical diagnosis.",
        lifestyle_data: {
          family_history: ["Diabetes"],
        },
      };

      const analysis = generateDemoHealthAnalysis(record);
      expect(analysis.overall_risk_level).toBe("Medium");
      const diabetesRisk = analysis.risks.find((r) => r.condition.includes("Diabetes"));
      expect(diabetesRisk).toBeDefined();
      expect(diabetesRisk?.risk_level).toBe("Medium");
    });

    it("displays a single positive General Wellness Profile card if user has zero medium/high risks", () => {
      const record: AssessmentRecord = {
        height_cm: 175,
        weight_kg: 68,
        bmi: 22.2,
        bmi_category: "Normal weight",
        symptoms: [],
        risk_level: "Low",
        ai_summary: "",
        recommendations: [],
        disclaimer: "This is not a medical diagnosis.",
        lifestyle_data: {
          smoking: false,
          harmful_substances: [],
          sleep_hours: 8,
          water_liters: 2.5,
        },
      };

      const analysis = generateDemoHealthAnalysis(record);
      expect(analysis.overall_risk_level).toBe("Low");
      expect(analysis.risks).toHaveLength(1);
      expect(analysis.risks[0].condition).toBe("General Wellness Profile");
      expect(analysis.risks[0].risk_level).toBe("Low");
    });

    it("flags acute chest discomfort with High risk and urgent clinical recommendation", () => {
      const record: AssessmentRecord = {
        height_cm: 175,
        weight_kg: 70,
        bmi: 22.9,
        bmi_category: "Normal weight",
        symptoms: ["Chest pain or discomfort", "Shortness of breath"],
        risk_level: "Low",
        ai_summary: "",
        recommendations: [],
        disclaimer: "This is not a medical diagnosis.",
        lifestyle_data: {},
      };

      const analysis = generateDemoHealthAnalysis(record);
      expect(analysis.overall_risk_level).toBe("High");
      expect(analysis.recommendations.some((rec) => rec.toLowerCase().includes("evaluation"))).toBe(true);
    });

    it("always enforces mandatory non-diagnostic disclaimer", () => {
      const record: AssessmentRecord = {
        height_cm: 175,
        weight_kg: 70,
        bmi: 22.9,
        bmi_category: "Normal weight",
        symptoms: [],
        risk_level: "Low",
        ai_summary: "",
        recommendations: [],
        disclaimer: "",
        lifestyle_data: {},
      };

      const analysis = generateDemoHealthAnalysis(record);
      expect(analysis.disclaimer).toContain("not a medical diagnosis");
    });
  });

  describe("analyzeHealthAssessment in demo/offline mode", () => {
    it("returns offline deterministic analysis when isDemo is true", async () => {
      const record: AssessmentRecord = {
        height_cm: 180,
        weight_kg: 85,
        bmi: 26.2,
        bmi_category: "Overweight",
        symptoms: ["Recurring headaches"],
        risk_level: "Low",
        ai_summary: "",
        recommendations: [],
        disclaimer: "This is not a medical diagnosis.",
        lifestyle_data: {
          sleep_hours: 5,
        },
      };

      const result = await analyzeHealthAssessment(record, true);
      expect(result).toBeDefined();
      expect(result.overall_risk_level).toBe("Medium");
      expect(result.risks.length).toBeGreaterThanOrEqual(1);
      expect(result.disclaimer).toContain("not a medical diagnosis");
    });
  });
});
