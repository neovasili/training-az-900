import { ResourceGroup } from "@pulumi/azure-native/resources";
import {
  VirtualMachine,
  VirtualMachineSizeTypes,
  VirtualMachineExtension,
} from "@pulumi/azure-native/compute";
import {
  PublicIPAddress,
  PublicIPAddressSkuName,
  NetworkInterface,
  VirtualNetwork,
  Subnet,
  NetworkSecurityGroup,
  SecurityRuleAccess,
  SecurityRuleProtocol,
} from "@pulumi/azure-native/network";

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

// Virtual Network
const vnet = new VirtualNetwork(
  "VNet",
  {
    resourceGroupName: resourceGroup.name,
    addressSpace: {
      addressPrefixes: ["10.0.0.0/16"],
    },
    tags,
  },
  { parent: resourceGroup },
);

// Subnet
const subnet = new Subnet(
  "Subnet",
  {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: vnet.name,
    addressPrefix: "10.0.1.0/24",
  },
  { parent: vnet },
);

// Public IP with Standard SKU
const publicIP = new PublicIPAddress(
  "PublicIP",
  {
    resourceGroupName: resourceGroup.name,
    sku: {
      name: PublicIPAddressSkuName.Standard,
    },
    publicIPAllocationMethod: "Static",
    tags,
  },
  { parent: resourceGroup },
);

// Network Security Group
const nsg = new NetworkSecurityGroup(
  "NSG",
  {
    resourceGroupName: resourceGroup.name,
    securityRules: [
      {
        name: "AllowHTTP",
        protocol: SecurityRuleProtocol.Tcp,
        sourcePortRange: "*",
        destinationPortRange: "80",
        sourceAddressPrefix: "*",
        destinationAddressPrefix: "*",
        access: SecurityRuleAccess.Allow,
        priority: 100,
        direction: "Inbound",
      },
    ],
    tags,
  },
  { parent: vnet },
);

// Network Interface
const nic = new NetworkInterface(
  "VMNic",
  {
    resourceGroupName: resourceGroup.name,
    ipConfigurations: [
      {
        name: "ipconfig1",
        subnet: {
          id: subnet.id,
        },
        publicIPAddress: {
          id: publicIP.id,
        },
      },
    ],
    networkSecurityGroup: {
      id: nsg.id,
    },
    tags,
  },
  { parent: subnet },
);

// Linux Virtual Machine
const virtualMachine = new VirtualMachine(
  "VirtualMachine",
  {
    resourceGroupName: resourceGroup.name,
    hardwareProfile: {
      vmSize: VirtualMachineSizeTypes.Standard_D2s_v3,
    },
    networkProfile: {
      networkInterfaces: [
        {
          id: nic.id,
          primary: true,
        },
      ],
    },
    osProfile: {
      computerName: "hostname",
      adminUsername: "azureuser",
      adminPassword: "Password1234!",
      linuxConfiguration: {
        disablePasswordAuthentication: false,
      },
    },
    storageProfile: {
      imageReference: {
        publisher: "Canonical",
        offer: "0001-com-ubuntu-server-jammy",
        sku: "22_04-lts",
        version: "latest",
      },
      osDisk: {
        createOption: "FromImage",
      },
    },
    tags,
  },
  { parent: subnet },
);

new VirtualMachineExtension(
  "NginxInstall",
  {
    resourceGroupName: resourceGroup.name,
    vmName: virtualMachine.name,
    publisher: "Microsoft.Azure.Extensions",
    type: "CustomScript",
    typeHandlerVersion: "2.1",
    settings: {
      commandToExecute:
        "sudo apt update && sudo apt install -y nginx && sudo systemctl enable nginx && sudo systemctl start nginx",
    },
  },
  { parent: virtualMachine },
);

export const publicIPAddress = publicIP.ipAddress;
export const vmId = virtualMachine.id;
