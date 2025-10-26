import { interpolate, asset } from "@pulumi/pulumi";
import { ResourceGroup } from "@pulumi/azure-native/resources";
import {
  StorageAccount,
  SkuName,
  BlobContainer,
  Blob,
  Kind,
  PublicNetworkAccess,
  PublicAccess,
} from "@pulumi/azure-native/storage";

const tags = {
  environment: "test",
  project: "az-900",
  purpose: "training",
  owner: "neovasili",
};

// Resource Group
const resourceGroup = new ResourceGroup("IntroAzureRG", {
  tags,
});

// Storage Account
const storageAccount = new StorageAccount(
  "introazurestorage",
  {
    accountName: "neovasilistorage",
    resourceGroupName: resourceGroup.name,
    sku: {
      name: SkuName.Standard_LRS,
    },
    kind: Kind.StorageV2,
    publicNetworkAccess: PublicNetworkAccess.Enabled,
    allowBlobPublicAccess: true,
    // If this is true, we don't have access to the container contents
    allowSharedKeyAccess: false,
    tags,
  },
  { parent: resourceGroup },
);

const blobContainer = new BlobContainer(
  "introcontainer",
  {
    accountName: storageAccount.name,
    resourceGroupName: resourceGroup.name,
    publicAccess: PublicAccess.Blob,
  },
  { parent: storageAccount },
);

const manifest = new Blob(
  "manifest",
  {
    accountName: storageAccount.name,
    resourceGroupName: resourceGroup.name,
    containerName: blobContainer.name,
    blobName: "manifest.json",
    contentType: "application/json",
    source: new asset.StringAsset(
      JSON.stringify(
        {
          app: "Intro to Azure",
          version: "1.0.0",
          description: "A sample application demonstrating Azure services.",
        },
        null,
        0,
      ),
    ),
  },
  { parent: blobContainer },
);

export const blobContainerUrl = interpolate`https://${storageAccount.name}.blob.core.windows.net/${blobContainer.name}`;
export const manifestUrl = interpolate`${blobContainerUrl}/${manifest.name}`;
