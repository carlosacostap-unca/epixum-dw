import { S3Client, PutObjectCommand, GetObjectCommand, GetBucketCorsCommand, PutBucketCorsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Only instantiate S3Client if credentials exist, to avoid build errors
export const s3Client = new S3Client({
  endpoint: process.env.IDRIVE_ENDPOINT || "https://dummy-endpoint.com",
  region: process.env.IDRIVE_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.IDRIVE_ACCESS_KEY_ID || "dummy-key",
    secretAccessKey: process.env.IDRIVE_SECRET_ACCESS_KEY || "dummy-secret",
  },
  forcePathStyle: true, // Needed for iDrive/MinIO
});

export async function configureBucketCors() {
    const bucketName = process.env.IDRIVE_BUCKET_NAME;
    if (!bucketName) throw new Error("Bucket name not configured");

    const corsRules = [
        {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedOrigins: ["*"], // For development; restrict in production
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000,
        },
    ];

    try {
        const command = new PutBucketCorsCommand({
            Bucket: bucketName,
            CORSConfiguration: {
                CORSRules: corsRules,
            },
        });

        await s3Client.send(command);
        console.log(`CORS configured successfully for bucket: ${bucketName}`);
        return true;
    } catch (error) {
        console.error("Error configuring CORS:", error);
        return false;
    }
}

export async function getPresignedUploadUrl(filename: string, fileType: string) {
  const bucketName = process.env.IDRIVE_BUCKET_NAME;

  if (!bucketName) {
    throw new Error("Bucket name not configured");
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    ContentType: fileType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return { url, fields: { key: filename } };
}

export async function listS3Objects(prefix: string) {
  const bucketName = process.env.IDRIVE_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("Bucket name not configured");
  }

  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix,
  });

  const response = await s3Client.send(command);
  return response.Contents || [];
}

export async function uploadToS3(key: string, buffer: Buffer, contentType: string) {
  const bucketName = process.env.IDRIVE_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("Bucket name not configured");
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return key;
}

export async function getPresignedDownloadUrl(filename: string) {
  const bucketName = process.env.IDRIVE_BUCKET_NAME;

  if (!bucketName) {
    throw new Error("Bucket name not configured");
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: filename,
    ResponseContentDisposition: "inline",
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return url;
}
