import { S3Client, ListObjectsV2Command, ListObjectVersionsCommand, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"; // ES Modules import
import _ from 'lodash';
import fs from 'fs'

const client = new S3Client()
const bucket = "template-storage-templatebucket-1upzyw6v9cs42"
const destinationBucket = process.env.DESTINATION_BUCKET_NAME

const dirs = [
  'wrk',
  'wrk/latest_etag_metadata',
  'wrk/latest_by_version',
  'wrk/templates'
]

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
})

async function main() {
  const command = new ListObjectsV2Command({
    Bucket: bucket
  })
  const response = await client.send(command)

  // Find all object keys which end in template.yaml of one level of depth
  let allObjects = []
  let continuationToken
  let i = 0
  do {
    console.log(`${i == 0 ? "First Run" : "Found continuation token"}, listing objects: ${i}`);
    let listObjects = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken })
    );
    allObjects = allObjects.concat(listObjects.Contents)
    fs.writeFileSync(`wrk/listObjects${i}.json`, JSON.stringify(listObjects, null, 2));
    continuationToken = listObjects.NextContinuationToken
    i++
  } while (continuationToken)
  fs.writeFileSync(`wrk/allObjects.json`, JSON.stringify(allObjects, null, 2));

  let templates = allObjects.filter((objectDetails) =>
    objectDetails.Key.match(/^[^\/]+\/template.yaml$/)
  );

  console.log(
    "Object Keys:",
    templates.map((e) => e.Key)
  );

  // Process each template - this can be replaced with a list of known object keys and could be done
  // in parallel.
  for (let i = 0; i < templates.length; i++) {
    await processObjectKey(templates[i].Key)
  }
}

async function processObjectKey(objectKey) {

  console.log(`Processing ${objectKey}`);

  const templateName = objectKey.replace(/\/template.yaml$/, '')


  // Retrieve all object versions for each template file
  const commandObjVersions = new ListObjectVersionsCommand({
    Bucket: bucket,
    Prefix: objectKey,
  })

  const response = await client.send(commandObjVersions)

  // Hard match on object key incase the prefix filter matched additional files.
  let s3Versions = response.Versions.filter((e) => e.Key === objectKey)

  // Get the most recent version for each ETag (ETags represent unique file content) to reduce calls
  // to HeadObject
  let groupByETag = Object.values(_.groupBy(s3Versions, "ETag"))
  let maxLastModifiedByETag = groupByETag.map((group) => _.maxBy(group, "LastModified"))

  // Enrich the s3Version data with HeadObject data
  await Promise.all(maxLastModifiedByETag.map(async (e, i) => {
    const headObject = new HeadObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      VersionId: e.VersionId,
    })

    maxLastModifiedByETag[i].HeadObject = await client.send(headObject)
  }))

  // Remove objects where the templateVersion is not defined
  maxLastModifiedByETag = maxLastModifiedByETag.filter((e) => e.HeadObject.Metadata.version)

  // fs.writeFileSync(`wrk/latest_etag_metadata/${templateName}.json`, JSON.stringify(maxLastModifiedByETag, null, 2))

  // Find the most recent s3Version for each templateVersion
  let groupByTemplateVersion = Object.values(_.groupBy(maxLastModifiedByETag, "HeadObject.Metadata.version"))
  let maxByTemplateVersion = groupByTemplateVersion.map((group) => _.maxBy(group, "LastModified"))

  // Sort by version ascending
  maxByTemplateVersion = maxByTemplateVersion.sort((a, b) => {
    let verA = a.HeadObject.Metadata.version.match(/(\d+)\.(\d+)\.(\d+)/).splice(1, 4)
    let verB = b.HeadObject.Metadata.version.match(/(\d+)\.(\d+)\.(\d+)/).splice(1, 4)

    for (let i = 0; i < 3; i++) {
      if (verA[i] != verB[i]) {
        return verA[i] - verB[i]
      }
    }
  })

  console.log("Version Order (check ascending):", maxByTemplateVersion.map((e) => e.HeadObject.Metadata.version))

  // fs.writeFileSync(`wrk/latest_by_version/${templateName}.json`, JSON.stringify(maxByTemplateVersion, null, 2))

  // Local folder to show uploads
  let dir = `wrk/templates/${templateName}`
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Iterate through the versions (increasing) and create the file / upload to s3
  // This must be done in order since newer versions will override newer versions
  for (let i = 0; i < maxByTemplateVersion.length; i++) {

    let e = maxByTemplateVersion[i]
    let versionSplit = e.HeadObject.Metadata.version.match(/(\d+)\.(\d+)\.(\d+)/).splice(1, 4)
    const getObject = new GetObjectCommand({
      Bucket: bucket,
      Key: e.Key,
      VersionId: e.VersionId
    })

    const getObjectResponse = await client.send(getObject)
    const str = await getObjectResponse.Body.transformToString();

    let keys = [
      // `${templateName}/template.yaml`, // REMOVE WHEN UPLOADING TO S3?
      `${templateName}/template-v${versionSplit[0]}.yaml`,
      `${templateName}/template-v${versionSplit[0]}.${versionSplit[1]}.yaml`,
      `${templateName}/template-v${versionSplit[0]}.${versionSplit[1]}.${versionSplit[2]}.yaml`,
    ]

    await Promise.all(keys.map(async (k) => {
      fs.writeFileSync(`wrk/templates/${k}`, str)

      const putObject = new PutObjectCommand({
        Bucket: destinationBucket,
        Key: k,
        Body: str,
        Metadata: e.HeadObject.Metadata,
        ContentType: "application/yaml"
      })
      if (destinationBucket != undefined) {
        console.log(`Uploading to S3: ${destinationBucket}/${k}`)
        await client.send(putObject)
      } else {
        console.log(`Skipping S3 Upload: ${destinationBucket}/${k}`)
      }
    }))
  }
}

await main();
