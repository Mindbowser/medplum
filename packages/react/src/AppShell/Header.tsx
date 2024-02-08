import { ActionIcon, Group, Indicator, AppShell as MantineAppShell, Menu, UnstyledButton } from '@mantine/core';
import { useMedplumProfile } from '@medplum/react-hooks';
import { IconChevronDown, IconClipboardCheck, IconMail } from '@tabler/icons-react';
import { ReactNode, useState } from 'react';
import { ResourceAvatar } from '../ResourceAvatar/ResourceAvatar';
import classes from './Header.module.css';
import { HeaderDropdown } from './HeaderDropdown';
import { HeaderSearchInput } from './HeaderSearchInput';

export interface HeaderProps {
  readonly pathname?: string;
  readonly searchParams?: URLSearchParams;
  readonly headerSearchDisabled?: boolean;
  readonly logo: ReactNode;
  readonly version?: string;
  readonly navbarToggle: () => void;
}

export function Header(props: HeaderProps): JSX.Element {
  const profile = useMedplumProfile();
  const [userMenuOpened, setUserMenuOpened] = useState(false);

  return (
    <MantineAppShell.Header p={8} style={{ zIndex: 101 }}>
      <Group justify="space-between">
        <Group gap="xs">
          <UnstyledButton className={classes.logoButton} onClick={props.navbarToggle}>
            {props.logo}
          </UnstyledButton>
          {!props.headerSearchDisabled && (
            <HeaderSearchInput pathname={props.pathname} searchParams={props.searchParams} />
          )}
        </Group>
        <Group gap="lg" pr="sm">
          <Indicator inline label="100" size={16} offset={2} position="bottom-end" color="red">
            <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Mail" onClick={() => console.log('foo')}>
              <IconMail />
            </ActionIcon>
          </Indicator>
          <Indicator inline label="200" size={16} offset={2} position="bottom-end" color="red">
            <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Tasks" onClick={() => console.log('foo')}>
              <IconClipboardCheck />
            </ActionIcon>
          </Indicator>
          <Menu
            width={260}
            shadow="xl"
            position="bottom-end"
            transitionProps={{ transition: 'pop-top-right' }}
            opened={userMenuOpened}
            onClose={() => setUserMenuOpened(false)}
          >
            <Menu.Target>
              <Indicator
                inline
                size={16}
                offset={4}
                position="bottom-end"
                color="gray.3"
                withBorder
                label={<IconChevronDown size={12} />}
              >
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label="Mail"
                  onClick={() => setUserMenuOpened((o) => !o)}
                >
                  <ResourceAvatar value={profile} radius="xl" size={32} />
                </ActionIcon>
              </Indicator>
            </Menu.Target>
            <Menu.Dropdown>
              <HeaderDropdown version={props.version} />
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </MantineAppShell.Header>
  );
}
