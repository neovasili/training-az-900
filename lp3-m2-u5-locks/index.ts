import { interpolate, asset } from "@pulumi/pulumi";
import { ResourceGroup } from "@pulumi/azure-native/resources";
import { ManagementLockAtResourceGroupLevel, LockLevel } from "@pulumi/azure-native/authorization";

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

new ManagementLockAtResourceGroupLevel("rg-lock", {
  lockName: "IntroAzureRGLock",
  resourceGroupName: resourceGroup.name,
  level: LockLevel.CanNotDelete,
  notes: "Locking the resource group to prevent accidental deletion",
});
