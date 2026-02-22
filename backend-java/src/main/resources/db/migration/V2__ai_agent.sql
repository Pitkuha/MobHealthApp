DO $$
BEGIN
    CREATE TYPE "AISubagent" AS ENUM ('PATIENT_COACH', 'DOCTOR_ASSISTANT', 'ADMIN_ASSISTANT');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "AIMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AISession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleSnapshot" "Role" NOT NULL,
    "subagent" "AISubagent" NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AISession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AIMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "AIMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AIAction" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AISession_userId_createdAt_idx" ON "AISession"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AIMessage_sessionId_createdAt_idx" ON "AIMessage"("sessionId", "createdAt");
CREATE INDEX IF NOT EXISTS "AIAction_sessionId_createdAt_idx" ON "AIAction"("sessionId", "createdAt");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AISession_userId_fkey') THEN
        ALTER TABLE "AISession"
            ADD CONSTRAINT "AISession_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AIMessage_sessionId_fkey') THEN
        ALTER TABLE "AIMessage"
            ADD CONSTRAINT "AIMessage_sessionId_fkey"
            FOREIGN KEY ("sessionId") REFERENCES "AISession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AIAction_sessionId_fkey') THEN
        ALTER TABLE "AIAction"
            ADD CONSTRAINT "AIAction_sessionId_fkey"
            FOREIGN KEY ("sessionId") REFERENCES "AISession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
