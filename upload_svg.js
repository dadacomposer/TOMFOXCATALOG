import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

const s3 = new S3Client({
  region: "auto",
  endpoint: "https://984e55700d5ab74893ff2cd768b58f8d.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "788b14e591787dffcd5e117183e8cfbb",
    secretAccessKey: "2379edaa91666993175399587a81014cc6d83a159f8ed6697b0a88b560ab9d01",
  },
});

async function run() {
  try {
    const fileContent = fs.readFileSync("/Users/dada/Downloads/Search for documents.svg");
    const data = await s3.send(new PutObjectCommand({
      Bucket: "tom-fox-music",
      Key: "assets/search-for-documents.svg",
      Body: fileContent,
      ContentType: "image/svg+xml"
    }));
    console.log("Success", data);
  } catch (err) {
    console.log("Error", err);
  }
}
run();
