import { useQuery } from "@tanstack/react-query";
import {
  createInstance,
  initSDK,
  SepoliaConfig,
} from "@zama-fhe/relayer-sdk/bundle";

export const useFhevm = () => {
  return useQuery({
    queryKey: ["fhevm-instance"],
    queryFn: async () => {
      await initSDK();
      const instance = await createInstance(SepoliaConfig);
      return instance;
    },
    staleTime: Infinity,
  });
};
