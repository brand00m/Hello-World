-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "multiplier" DECIMAL(5,4),
    "contact_name" TEXT,
    "contact_email" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "phone" TEXT,
    "netsuite_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "manufacturer_id" TEXT,
    "vendor_id" TEXT,
    "category_id" TEXT,
    "point_type" TEXT,
    "list_price" DECIMAL(12,2),
    "discount_price" DECIMAL(12,2),
    "pricing_date" DATE,
    "submittal_name" TEXT,
    "priority_ranking" INTEGER,
    "spec_section" TEXT,
    "is_by_others" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_documents" (
    "id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "doc_type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "job_name" TEXT NOT NULL,
    "job_number" TEXT,
    "submittal_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_items" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bom_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submittals" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submittals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submittal_sections" (
    "id" TEXT NOT NULL,
    "submittal_id" TEXT NOT NULL,
    "category_id" TEXT,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "include_valve_schedule" BOOLEAN NOT NULL DEFAULT false,
    "include_damper_schedule" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submittal_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submittal_items" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "spec_override" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submittal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ui_count" INTEGER NOT NULL DEFAULT 0,
    "ao_count" INTEGER NOT NULL DEFAULT 0,
    "do_count" INTEGER NOT NULL DEFAULT 0,
    "startup_hours" DECIMAL(5,2),
    "cad_hours" DECIMAL(5,2),
    "design_hours" DECIMAL(5,2),
    "programming_hours" DECIMAL(5,2),
    "graphics_hours" DECIMAL(5,2),
    "pm_hours" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controllers" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "ui_capacity" INTEGER,
    "uo_capacity" INTEGER,
    "ao_capacity" INTEGER,
    "bo_capacity" INTEGER,
    "has_hoa" BOOLEAN NOT NULL DEFAULT false,
    "has_motion" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "controllers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_model_mappings" (
    "id" TEXT NOT NULL,
    "point_type_id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "point_model_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendors_company_name_key" ON "vendors"("company_name");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturers_name_key" ON "manufacturers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "part_categories_name_key" ON "part_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "point_types_name_key" ON "point_types"("name");

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "part_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_documents" ADD CONSTRAINT "part_documents_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submittals" ADD CONSTRAINT "submittals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submittal_sections" ADD CONSTRAINT "submittal_sections_submittal_id_fkey" FOREIGN KEY ("submittal_id") REFERENCES "submittals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submittal_sections" ADD CONSTRAINT "submittal_sections_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "part_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submittal_items" ADD CONSTRAINT "submittal_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "submittal_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submittal_items" ADD CONSTRAINT "submittal_items_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_model_mappings" ADD CONSTRAINT "point_model_mappings_point_type_id_fkey" FOREIGN KEY ("point_type_id") REFERENCES "point_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_model_mappings" ADD CONSTRAINT "point_model_mappings_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
