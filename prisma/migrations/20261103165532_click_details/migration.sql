-- AlterTable
ALTER TABLE "Click" ADD COLUMN     "asn" INTEGER,
ADD COLUMN     "browserVersion" TEXT,
ADD COLUMN     "deviceModel" TEXT,
ADD COLUMN     "deviceVendor" TEXT,
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "isp" TEXT,
ADD COLUMN     "osVersion" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "timezone" TEXT;
