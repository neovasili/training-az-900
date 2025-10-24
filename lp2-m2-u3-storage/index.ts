import { ResourceGroup } from "@pulumi/azure-native/resources";
import {
  StorageAccount,
  SkuName,
  BlobContainer,
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
const storageAccount = new StorageAccount("introazurestorage", {
  accountName: "neovasilistorage",
  resourceGroupName: resourceGroup.name,
  sku: {
    name: SkuName.Standard_LRS,
  },
  kind: Kind.StorageV2,
  publicNetworkAccess: PublicNetworkAccess.Enabled,
  tags,
}, { parent: resourceGroup });

const blobContainer = new BlobContainer("introcontainer", {
  accountName: storageAccount.name,
  resourceGroupName: resourceGroup.name,
  publicAccess: PublicAccess.None,
}, { parent: storageAccount });
