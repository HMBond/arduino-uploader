type DetectedPorts = {
  matching_boards: { name: string; fqbn: string }[] | undefined;
  port: {
    address: string;
    label: string;
    protocol: string;
    protocol_label: string;
    properties: {
      pid: string;
      serialNumber: string;
      vid: string;
    };
  };
}[];

type BoardList = Board[];

type Board = {
  matching_boards: { name: string; fqbn: string }[];
  port: {
    address: string;
    label: string;
    protocol: string;
    protocol_label: string;
    properties: {
      pid: string;
      serialNumber: string;
      vid: string;
    };
  };
};
