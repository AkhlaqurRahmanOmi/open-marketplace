-- CreateTable
CREATE TABLE "NotificationConfig" (
    "id" SERIAL NOT NULL,
    "event" VARCHAR(100) NOT NULL,
    "channels" "NotificationChannel"[],
    "template" VARCHAR(100) NOT NULL,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "retries" INTEGER NOT NULL DEFAULT 3,
    "conditions" JSONB,
    "metadata" JSONB,
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationConfig_event_key" ON "NotificationConfig"("event");

-- CreateIndex
CREATE INDEX "NotificationConfig_event_idx" ON "NotificationConfig"("event");

-- CreateIndex
CREATE INDEX "NotificationConfig_enabled_idx" ON "NotificationConfig"("enabled");
