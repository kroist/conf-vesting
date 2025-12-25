import { useEncryptedTokenBalances } from "@/hooks/useEncryptedTokenBalances";
import type { MockToken } from "../../lib/mockData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { TokenBalance } from "./TokenBalance";
import { TokenFaucet } from "./TokenFaucet";

interface TokenTableProps {
  tokens: MockToken[];
}

export function TokenTable({ tokens }: TokenTableProps) {

  const { data: encryptedTokenBalances } = useEncryptedTokenBalances();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tokens.map((token) => (
            <TableRow key={token.address}>
              <TableCell className="font-semibold">{token.symbol}</TableCell>
              <TableCell>{token.name}</TableCell>
              {
                encryptedTokenBalances ? (
                  <TableCell className="text-right">
                    <TokenBalance tokenAddress={token.address as `0x${string}`} />
                  </TableCell>
                ) : (
                  <TableCell className="text-right text-muted-foreground">
                    Loading...
                  </TableCell>
                )
              }
              <TableCell className="text-right">
                <TokenFaucet token={token} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
