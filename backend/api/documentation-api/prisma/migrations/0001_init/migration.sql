-- CreateTable
CREATE TABLE "documentation_ideas" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'backlog',
    "category" VARCHAR(100) NOT NULL,
    "priority" VARCHAR(50) NOT NULL DEFAULT 'medium',
    "assigned_to" VARCHAR(255),
    "created_by" VARCHAR(255) NOT NULL,
    "system_id" VARCHAR(255),
    "tags" JSONB NOT NULL DEFAULT '[]',
    "estimated_hours" INTEGER,
    "actual_hours" INTEGER,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "designated_timestamp" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentation_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentation_systems" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(100) NOT NULL,
    "url" VARCHAR(512),
    "status" VARCHAR(50) NOT NULL DEFAULT 'unknown',
    "last_checked" TIMESTAMP(3),
    "response_time_ms" INTEGER,
    "version" VARCHAR(100),
    "owner" VARCHAR(255),
    "tags" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB,
    "icon" VARCHAR(255),
    "color" VARCHAR(100),
    "host" VARCHAR(255),
    "port" INTEGER,
    "created_by" VARCHAR(255),
    "designated_timestamp" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentation_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentation_files" (
    "id" TEXT NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(255) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "file_path" VARCHAR(1024) NOT NULL,
    "description" TEXT,
    "idea_id" VARCHAR(255),
    "system_id" VARCHAR(255),
    "uploaded_by" VARCHAR(255),
    "is_public" BOOLEAN NOT NULL DEFAULT FALSE,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "checksum" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "designated_timestamp" TIMESTAMP(3),

    CONSTRAINT "documentation_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentation_audit_log" (
    "id" TEXT NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(255) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "user_id" VARCHAR(255),
    "changes" JSONB,
    "ip_address" VARCHAR(255),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentation_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documentation_ideas_status_idx" ON "documentation_ideas"("status");

-- CreateIndex
CREATE INDEX "documentation_ideas_category_idx" ON "documentation_ideas"("category");

-- CreateIndex
CREATE INDEX "documentation_ideas_priority_idx" ON "documentation_ideas"("priority");

-- CreateIndex
CREATE INDEX "documentation_ideas_assigned_to_idx" ON "documentation_ideas"("assigned_to");

-- CreateIndex
CREATE INDEX "documentation_ideas_created_by_idx" ON "documentation_ideas"("created_by");

-- CreateIndex
CREATE INDEX "documentation_systems_status_idx" ON "documentation_systems"("status");

-- CreateIndex
CREATE INDEX "documentation_systems_type_idx" ON "documentation_systems"("type");

-- CreateIndex
CREATE INDEX "documentation_systems_owner_idx" ON "documentation_systems"("owner");

-- CreateIndex
CREATE INDEX "documentation_files_idea_id_idx" ON "documentation_files"("idea_id");

-- CreateIndex
CREATE INDEX "documentation_files_system_id_idx" ON "documentation_files"("system_id");

-- CreateIndex
CREATE INDEX "documentation_files_uploaded_by_idx" ON "documentation_files"("uploaded_by");

-- CreateIndex
CREATE INDEX "documentation_audit_log_entity_type_idx" ON "documentation_audit_log"("entity_type");

-- CreateIndex
CREATE INDEX "documentation_audit_log_entity_id_idx" ON "documentation_audit_log"("entity_id");

-- CreateIndex
CREATE INDEX "documentation_audit_log_action_idx" ON "documentation_audit_log"("action");

-- AddForeignKey
ALTER TABLE "documentation_ideas" ADD CONSTRAINT "documentation_ideas_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "documentation_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentation_files" ADD CONSTRAINT "documentation_files_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "documentation_ideas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentation_files" ADD CONSTRAINT "documentation_files_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "documentation_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;
