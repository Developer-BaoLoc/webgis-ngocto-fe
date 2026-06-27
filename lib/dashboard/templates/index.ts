import { alertTemplate } from "./alert-template";
import { aquacultureTemplate } from "./aquaculture-template";
import { cropTemplate } from "./crop-template";
import { iocTemplate } from "./ioc-template";
import { irrigationTemplate } from "./irrigation-template";
import { ocopTemplate } from "./ocop-template";
import { riceTemplate } from "./rice-template";

export type {
  DashboardTemplate,
  DashboardTemplatePlaceholder,
  DashboardTemplateRequirement,
  DashboardTemplateWidget,
} from "./types";
export {
  applyDashboardTemplate,
  collectTemplatePlaceholders,
  hasUnresolvedPlaceholders,
  replaceTemplatePlaceholders,
  validateTemplateValues,
  type DashboardTemplatePlaceholderValues,
} from "./apply-template";

export const dashboardTemplates = [
  iocTemplate,
  aquacultureTemplate,
  riceTemplate,
  cropTemplate,
  irrigationTemplate,
  ocopTemplate,
  alertTemplate,
];

export function getDashboardTemplateByCode(code: string) {
  return dashboardTemplates.find((template) => template.code === code) ?? null;
}
