-- CreateTable
CREATE TABLE "App" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "platform" TEXT,
    "developer" TEXT,
    "storeUrl" TEXT,
    "iconUrl" TEXT,
    "appType" TEXT,
    "webAccessible" BOOLEAN,
    "webUrl" TEXT,
    "loginRequired" BOOLEAN,
    "loginMethods" TEXT,
    "ageVerificationRequired" BOOLEAN,
    "ageVerificationMethod" TEXT,
    "subscriptionRequiredForLongChat" BOOLEAN,
    "allFeaturesAvailableWithoutSubscription" BOOLEAN,
    "subscriptionFeatures" TEXT,
    "subscriptionCost" TEXT,
    "languagesSupported" TEXT,
    "notes" TEXT,
    "evidenceLinks" TEXT,
    "evaluatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "adapterType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "config" TEXT,
    "loginMeta" TEXT,
    "summary" TEXT,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Run_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MessageTurn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "turnIndex" INTEGER NOT NULL,
    "inputMessage" TEXT NOT NULL,
    "response" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "sentAt" DATETIME,
    "receivedAt" DATETIME,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageTurn_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT,
    "turnId" TEXT,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Artifact_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Artifact_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "MessageTurn" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
