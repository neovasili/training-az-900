import {
  ComponentResource,
  ComponentResourceOptions,
  asset,
} from "@pulumi/pulumi";
import {
  StorageAccount,
  SkuName,
  Blob,
  Kind,
  StorageAccountStaticWebsite,
} from "@pulumi/azure-native/storage";
import { Profile, AFDOrigin, AFDOriginGroup } from "@pulumi/azure-native/cdn";
import { ResourceGroup } from "@pulumi/azure-native/resources";

const tags = {
  environment: "test",
  project: "az-900",
  purpose: "training",
  owner: "neovasili",
};

interface StaticWebsiteArgs {
  appName: string;
  resourceGroup: ResourceGroup;
}

class StaticWebsite extends ComponentResource {
  public readonly storageAccount: StorageAccount;

  constructor(
    name: string,
    args: StaticWebsiteArgs,
    opts?: ComponentResourceOptions,
  ) {
    super("pkg:frontend:StaticWebsite", name, args, opts);

    const { appName, resourceGroup } = args;

    this.storageAccount = new StorageAccount(
      `${appName}Storage`,
      {
        accountName: `${appName}storageacct`.toLowerCase(),
        resourceGroupName: resourceGroup.name,
        sku: {
          name: SkuName.Standard_LRS,
        },
        kind: Kind.StorageV2,
        enableHttpsTrafficOnly: true,
        tags,
      },
      { parent: resourceGroup },
    );

    const staticWebsite = new StorageAccountStaticWebsite(
      `${appName}StaticWebsite`,
      {
        accountName: this.storageAccount.name,
        resourceGroupName: resourceGroup.name,
        indexDocument: "index.html",
        error404Document: "404.html",
      },
      { parent: this.storageAccount },
    );

    const indexFile = new Blob(
      `${appName}IndexFile`,
      {
        accountName: this.storageAccount.name,
        resourceGroupName: resourceGroup.name,
        containerName: "$web",
        blobName: "index.html",
        contentType: "text/html",
        source: new asset.StringAsset(
          `<html><body><h1>Welcome to Azure! This is ${appName}</h1></body></html>`,
        ),
      },
      { parent: staticWebsite },
    );

    const manifest = new Blob(
      `${appName}Manifest`,
      {
        accountName: this.storageAccount.name,
        resourceGroupName: resourceGroup.name,
        containerName: "$web",
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
      { parent: staticWebsite },
    );
  }
}

interface StaticWebsiteOriginArgs {
  appName: string;
  frontdoorProfile: Profile;
  resourceGroup: ResourceGroup;
  staticWebsite: StaticWebsite;
}

class StaticWebsiteOrigin extends ComponentResource {
  public readonly originGroup: AFDOriginGroup;

  constructor(
    name: string,
    args: StaticWebsiteOriginArgs,
    opts?: ComponentResourceOptions,
  ) {
    super("pkg:frontend:StaticWebsiteOrigin", name, args, opts);

    const { appName, frontdoorProfile, resourceGroup, staticWebsite } = args;

    // The static website hostname (e.g. mystorage.z22.web.core.windows.net)
    const originHost = staticWebsite.storageAccount.primaryEndpoints.apply(
      (e) => e.web.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    );

    // One origin group per frontend
    this.originGroup = new AFDOriginGroup(
      `${appName}OriginGroup`,
      {
        profileName: frontdoorProfile.name,
        resourceGroupName: resourceGroup.name,
        loadBalancingSettings: {
          sampleSize: 4,
          successfulSamplesRequired: 3,
          additionalLatencyInMilliseconds: 50,
        },
        healthProbeSettings: {
          probePath: "/",
          probeRequestType: "HEAD",
          probeProtocol: "Https",
          probeIntervalInSeconds: 120,
        },
      },
      { parent: frontdoorProfile },
    );

    // One origin per frontend (pointing to the static website endpoint)
    const origin = new AFDOrigin(
      `${appName}Origin`,
      {
        profileName: frontdoorProfile.name,
        resourceGroupName: resourceGroup.name,
        originGroupName: this.originGroup.name,
        hostName: originHost,
        httpsPort: 443,
        originHostHeader: originHost,
        priority: 1,
        weight: 1000,
      },
      { parent: this.originGroup },
    );
  }
}

export {
  StaticWebsite,
  StaticWebsiteArgs,
  StaticWebsiteOrigin,
  StaticWebsiteOriginArgs,
};
