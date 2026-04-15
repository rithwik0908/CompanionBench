import Papa from "papaparse";
import { prisma } from "./db";

export interface AppCsvRow {
  name: string;
  platform?: string;
  developer?: string;
  store_url?: string;
  app_type?: string;
  web_accessible?: string;
  web_url?: string;
  login_required?: string;
  login_methods?: string;
  age_verification_required?: string;
  age_verification_method?: string;
  subscription_required_for_long_chat?: string;
  all_features_available_without_subscription?: string;
  subscription_features?: string;
  subscription_cost?: string;
  languages_supported?: string;
  notes?: string;
}

function parseBool(val: string | undefined): boolean | null {
  if (!val || val.trim() === "") return null;
  const v = val.trim().toLowerCase();
  if (v === "true" || v === "yes" || v === "1") return true;
  if (v === "false" || v === "no" || v === "0") return false;
  return null;
}

export function parseCsvContent(content: string): AppCsvRow[] {
  const result = Papa.parse<AppCsvRow>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });
  return result.data;
}

export async function importAppsFromCsv(rows: AppCsvRow[]): Promise<number> {
  let count = 0;
  for (const row of rows) {
    if (!row.name || row.name.trim() === "") continue;
    await prisma.app.create({
      data: {
        name: row.name.trim(),
        platform: row.platform?.trim() || null,
        developer: row.developer?.trim() || null,
        storeUrl: row.store_url?.trim() || null,
        appType: row.app_type?.trim() || null,
        webAccessible: parseBool(row.web_accessible),
        webUrl: row.web_url?.trim() || null,
        loginRequired: parseBool(row.login_required),
        loginMethods: row.login_methods?.trim() || null,
        ageVerificationRequired: parseBool(row.age_verification_required),
        ageVerificationMethod: row.age_verification_method?.trim() || null,
        subscriptionRequiredForLongChat: parseBool(row.subscription_required_for_long_chat),
        allFeaturesAvailableWithoutSubscription: parseBool(row.all_features_available_without_subscription),
        subscriptionFeatures: row.subscription_features?.trim() || null,
        subscriptionCost: row.subscription_cost?.trim() || null,
        languagesSupported: row.languages_supported?.trim() || null,
        notes: row.notes?.trim() || null,
      },
    });
    count++;
  }
  return count;
}

export async function exportAppsToCsv(): Promise<string> {
  const apps = await prisma.app.findMany({ orderBy: { name: "asc" } });
  const rows = apps.map((app) => ({
    name: app.name,
    platform: app.platform || "",
    developer: app.developer || "",
    store_url: app.storeUrl || "",
    app_type: app.appType || "",
    web_accessible: app.webAccessible === null ? "" : app.webAccessible ? "True" : "False",
    web_url: app.webUrl || "",
    login_required: app.loginRequired === null ? "" : app.loginRequired ? "True" : "False",
    login_methods: app.loginMethods || "",
    age_verification_required: app.ageVerificationRequired === null ? "" : app.ageVerificationRequired ? "True" : "False",
    age_verification_method: app.ageVerificationMethod || "",
    subscription_required_for_long_chat: app.subscriptionRequiredForLongChat === null ? "" : app.subscriptionRequiredForLongChat ? "True" : "False",
    all_features_available_without_subscription: app.allFeaturesAvailableWithoutSubscription === null ? "" : app.allFeaturesAvailableWithoutSubscription ? "True" : "False",
    subscription_features: app.subscriptionFeatures || "",
    subscription_cost: app.subscriptionCost || "",
    languages_supported: app.languagesSupported || "",
    notes: app.notes || "",
  }));
  return Papa.unparse(rows);
}
