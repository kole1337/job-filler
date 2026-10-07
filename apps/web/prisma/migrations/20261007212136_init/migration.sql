-- CreateTable
CREATE TABLE "Profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL DEFAULT '',
    "middleName" TEXT,
    "lastName" TEXT NOT NULL DEFAULT '',
    "preferredName" TEXT,
    "dateOfBirth" TEXT,
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "phoneCountry" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postcode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'GB',
    "nationality" TEXT,
    "rightToWorkUK" BOOLEAN,
    "needsVisaSponsorship" BOOLEAN,
    "linkedinUrl" TEXT,
    "portfolioUrl" TEXT,
    "githubUrl" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Education" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "institution" TEXT NOT NULL,
    "qualificationType" TEXT NOT NULL,
    "fieldOfStudy" TEXT,
    "gradeType" TEXT NOT NULL,
    "gradeValue" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "jobTitle" TEXT NOT NULL,
    "employer" TEXT NOT NULL,
    "location" TEXT,
    "employmentType" TEXT,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "CustomAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "matchHints" TEXT NOT NULL DEFAULT '[]',
    "sensitive" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomAnswer_key_key" ON "CustomAnswer"("key");
