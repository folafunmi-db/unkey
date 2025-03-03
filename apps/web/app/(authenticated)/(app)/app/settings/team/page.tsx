"use client";
import { EmptyPlaceholder } from "@/components/dashboard/empty-placeholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { InviteButton } from "./invite";

import Confirm from "@/components/dashboard/confirm";
import { PageHeader } from "@/components/dashboard/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth, useClerk, useOrganization } from "@clerk/nextjs";

import { Loading } from "@/components/dashboard/loading";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
type Member = {
  id: string;
  name: string;
  image: string;
  role: "basic_member" | "admin" | "guest_member";
  email?: string;
};

export default function TeamPage() {
  const { user, organization } = useClerk();

  if (!organization) {
    return (
      <EmptyPlaceholder>
        <EmptyPlaceholder.Title>This is a personal account</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          You can only manage teams in paid workspaces.
        </EmptyPlaceholder.Description>

        <Link href="/new">
          <Button>Create a new workspace</Button>
        </Link>
      </EmptyPlaceholder>
    );
  }

  const isAdmin =
    user?.organizationMemberships.find((m) => m.organization.id === organization.id)?.role ===
    "admin";

  type Tab = "members" | "invitations";
  const [tab, setTab] = useState<Tab>("members");

  const actions: React.ReactNode[] = [
    <Select value={tab} onValueChange={(value: Tab) => setTab(value)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="members">Members</SelectItem>
          <SelectItem value="invitations">Invitations</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>,
  ];
  if (isAdmin) {
    actions.push(<InviteButton />);
  }

  return (
    <div>
      <PageHeader title="Members" description="Manage your team members" actions={actions} />

      {tab === "members" ? <Members /> : <Invitations />}
    </div>
  );
}

const Members: React.FC = () => {
  const { user } = useClerk();

  const { isLoaded, membershipList, membership, organization } = useOrganization({
    membershipList: { limit: 20, offset: 0 },
  });

  if (!isLoaded) {
    return (
      <div className="animate-in relative fade-in-50 flex min-h-[150px] flex-col items-center justify-center rounded-md border  p-8 text-center">
        <div className="flex flex-col items-center justify-center mx-auto">
          <Loading />
        </div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Role</TableHead>

          <TableHead>{/*/ empty */}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {membershipList?.map(({ id, role, publicUserData }) => (
          <TableRow key={id}>
            <TableCell>
              <div className="flex items-center flex-grow w-full gap-2">
                <Avatar>
                  <AvatarImage src={publicUserData.imageUrl} />
                  <AvatarFallback>{publicUserData.identifier.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="font-medium text-content">{`${publicUserData.firstName} ${publicUserData.lastName}`}</span>
                  <span className="text-xs text-content-subtle">{publicUserData.identifier}</span>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <RoleSwitcher member={{ id: publicUserData.userId!, role }} />
            </TableCell>
            <TableCell>
              {membership?.role === "admin" && publicUserData.userId !== user?.id ? (
                <Confirm
                  variant="alert"
                  title="Remove member"
                  description={`Are you sure you want to remove ${publicUserData.identifier}?`}
                  onConfirm={() => {
                    if (publicUserData.userId) {
                      organization?.removeMember(publicUserData.userId);
                    }
                  }}
                  trigger={
                    <Button variant="secondary" size="sm">
                      Remove
                    </Button>
                  }
                />
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const Invitations: React.FC = () => {
  const { isLoaded, invitationList } = useOrganization({
    invitationList: { limit: 20, offset: 0 },
  });
  const { toast } = useToast();

  if (!isLoaded) {
    return (
      <div className="animate-in relative fade-in-50 flex min-h-[150px] flex-col items-center justify-center rounded-md border  p-8 text-center">
        <div className="flex flex-col items-center justify-center mx-auto">
          <Loading />
        </div>
      </div>
    );
  }

  if (!invitationList || invitationList.length === 0) {
    return (
      <EmptyPlaceholder>
        <EmptyPlaceholder.Title>No pending invitations</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>Invite members to your team</EmptyPlaceholder.Description>
        <InviteButton />
      </EmptyPlaceholder>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>

          <TableHead>{/*/ empty */}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitationList?.map((invitation) => (
          <TableRow key={invitation.id}>
            <TableCell>
              <span className="font-medium text-content">{invitation.emailAddress}</span>
            </TableCell>
            <TableCell>
              <StatusBadge status={invitation.status} />
            </TableCell>

            <TableCell>
              <Button
                variant="alert"
                size="sm"
                onClick={async () => {
                  await invitation.revoke();
                  toast({
                    title: "Success",
                    description: "Invitation revoked",
                  });
                }}
              >
                Revoke
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const RoleSwitcher: React.FC<{ member: { id: string; role: Member["role"] } }> = ({ member }) => {
  const [role, setRole] = useState(member.role);
  const [isLoading, setLoading] = useState(false);
  const { organization } = useOrganization();
  const { toast } = useToast();
  const { userId } = useAuth();
  async function updateRole(role: Member["role"]) {
    try {
      setLoading(true);
      if (!organization) {
        return;
      }
      await organization?.updateMember({ userId: member.id, role });

      setRole(role);
      toast({
        title: "Success",
        description: "Role updated",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "An error occured while updating the role",
        variant: "alert",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Select
      value={role}
      disabled={member.id === userId}
      onValueChange={async (value: Member["role"]) => {
        updateRole(value);
      }}
    >
      <SelectTrigger className="w-[180px]">
        {isLoading ? <Loading /> : <SelectValue />}
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="basic_member">Member</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

const StatusBadge: React.FC<{ status: "pending" | "accepted" | "revoked" }> = ({ status }) => {
  switch (status) {
    case "pending":
      return <Badge variant="primary">Pending</Badge>;
    case "accepted":
      return <Badge variant="secondary">Accepted</Badge>;
    case "revoked":
      return <Badge variant="secondary">Revoked</Badge>;

    default:
      return null;
  }
};
