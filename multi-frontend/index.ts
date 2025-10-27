import * as pulumi from "@pulumi/pulumi";
import {
  Profile,
  AFDEndpoint,
  Rule,
  RuleSet,
  SkuName,
  Route,
  MatchProcessingBehavior,
  ForwardingProtocol,
} from "@pulumi/azure-native/cdn";
import { ResourceGroup } from "@pulumi/azure-native/resources";

import { StaticWebsite, StaticWebsiteOrigin } from "./website";

const tags = {
  environment: "test",
  project: "az-900",
  purpose: "training",
  owner: "neovasili",
};

// ===============================
// Shared Resources
// ===============================

const resourceGroup = new ResourceGroup("rg-frontend", {
  tags,
});

const afdProfile = new Profile(
  "afdProfile",
  {
    resourceGroupName: resourceGroup.name,
    sku: { name: SkuName.Standard_AzureFrontDoor },
    location: "Global",
    tags,
  },
  { parent: resourceGroup },
);

const afdEndpoint = new AFDEndpoint(
  "afdEndpoint",
  {
    resourceGroupName: resourceGroup.name,
    profileName: afdProfile.name,
    tags,
  },
  { parent: afdProfile },
);

const sharedRuleSet = new RuleSet(
  "sharedRuleSet",
  {
    resourceGroupName: resourceGroup.name,
    profileName: afdProfile.name,
  },
  { parent: afdProfile },
);

// ===============================
// Per-Frontend Configuration
// ===============================

// Suppose we have multiple frontends
const frontends = [
  { name: "weba", path: "/ui/front-1" },
  { name: "webb", path: "/ui/front-2" },
];

const baseApp = new StaticWebsite(
  "baseapp",
  {
    appName: "baseapp",
    resourceGroup,
  },
  { parent: resourceGroup as pulumi.Resource },
);

const baseAppOrigin = new StaticWebsiteOrigin(
  "baseAppOrigin",
  {
    appName: "baseapp",
    frontdoorProfile: afdProfile,
    resourceGroup,
    staticWebsite: baseApp,
  },
  { parent: afdProfile },
);

// One rule per frontend to match the path and route to its origin group
const baseAppRoute = new Route(
  "FrontendsRoute",
  {
    resourceGroupName: resourceGroup.name,
    profileName: afdProfile.name,
    endpointName: afdEndpoint.name,
    ruleSets: [{ id: sharedRuleSet.id }],
    originGroup: { id: baseAppOrigin.originGroup.id },
    supportedProtocols: ["Https"],
    httpsRedirect: "Enabled",
    forwardingProtocol: "HttpsOnly",
    linkToDefaultDomain: "Enabled",
    patternsToMatch: ["/"],
    originPath: "/", // you can adjust if static files are nested
    enabledState: "Enabled",
  },
  {
    parent: baseAppOrigin,
    dependsOn: [afdEndpoint, baseAppOrigin, sharedRuleSet],
  },
);

frontends.forEach((app, index) => {
  const staticWebsite = new StaticWebsite(
    app.name,
    {
      appName: app.name,
      resourceGroup,
    },
    { parent: resourceGroup as pulumi.Resource },
  );

  const appOrigin = new StaticWebsiteOrigin(
    `${app.name}Origin`,
    {
      appName: app.name,
      frontdoorProfile: afdProfile,
      resourceGroup,
      staticWebsite,
    },
    { parent: afdProfile },
  );

  // One rule per frontend to match the path and route to its origin group
  new Route(
    `${app.name}Route`,
    {
      resourceGroupName: resourceGroup.name,
      profileName: afdProfile.name,
      endpointName: afdEndpoint.name,
      originGroup: { id: appOrigin.originGroup.id },
      supportedProtocols: ["Https"],
      httpsRedirect: "Enabled",
      forwardingProtocol: "HttpsOnly",
      linkToDefaultDomain: "Enabled",
      patternsToMatch: [`${app.path}/*`],
      originPath: "/", // you can adjust if static files are nested
      enabledState: "Enabled",
    },
    {
      parent: appOrigin,
      dependsOn: [afdEndpoint, appOrigin, sharedRuleSet],
    },
  );
});
