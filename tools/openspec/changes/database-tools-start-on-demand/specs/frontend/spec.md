# Frontend Specification: DatabasePage Container Management

## ADDED Requirements

### Requirement: Container Status Detection

The DatabasePage component SHALL detect the runtime status of database tool containers before rendering action buttons, enabling appropriate user interactions based on container state.

#### Scenario: Detect running container

- **GIVEN** a database tool container (pgAdmin, pgWeb, Adminer, or QuestDB) is running
- **WHEN** the DatabasePage component loads
- **THEN** the component queries the Service Launcher API (`GET /api/health/containers`)
- **AND** the API returns `{ containers: { pgadmin: { running: true } } }`
- **AND** the button for that tool displays in "running" state (blue, database icon, tool name)

#### Scenario: Detect stopped container

- **GIVEN** a database tool container is stopped
- **WHEN** the DatabasePage component loads
- **THEN** the component queries the Service Launcher API
- **AND** the API returns `{ containers: { pgadmin: { running: false } } }`
- **AND** the button for that tool displays in "stopped" state (yellow, play icon, "Start {tool}")

#### Scenario: Handle API failure gracefully

- **GIVEN** the Service Launcher API is unreachable
- **WHEN** the DatabasePage attempts to fetch container status
- **THEN** the fetch operation fails with a network error
- **AND** the component shows a fallback state (assume containers are running, load iframe normally)
- **AND** the component logs the error to console for debugging

---

### Requirement: Container Start Action

The DatabasePage component SHALL provide a user interface action to start stopped database tool containers, with clear visual feedback throughout the startup process.

#### Scenario: Start stopped container successfully

- **GIVEN** a database tool container is stopped
- **AND** the DatabasePage button shows "Start pgAdmin" (yellow, play icon)
- **WHEN** the user clicks the "Start pgAdmin" button
- **THEN** the component calls `POST /api/containers/pgadmin/start`
- **AND** the button immediately transitions to "starting" state (disabled, spinner, "Starting pgAdmin...")
- **AND** upon successful API response, the button transitions to "running" state
- **AND** the iframe automatically loads the tool's URL
- **AND** a success toast notification displays: "pgAdmin started successfully!"

#### Scenario: Start container failure

- **GIVEN** a database tool container is stopped
- **AND** the user clicks "Start pgAdmin"
- **WHEN** the API returns an error (e.g., Docker daemon not running)
- **THEN** the button returns to "stopped" state
- **AND** an error toast notification displays with the error message
- **AND** the toast includes a "Show Details" button
- **AND** clicking "Show Details" opens a modal with:
  - Full error message
  - Fallback CLI command (copyable)
  - Retry button

#### Scenario: Start container timeout

- **GIVEN** a database tool container starts but health check times out
- **WHEN** the API returns `{ success: true, healthy: false, message: 'Health check timeout' }`
- **THEN** the button transitions to "running" state
- **AND** the iframe loads (partial success)
- **AND** a warning toast displays: "pgAdmin started but may still be initializing. Refresh if needed."

---

### Requirement: Button Visual States

The DatabasePage component SHALL render database tool buttons with distinct visual states (running, stopped, starting) to communicate container status and available actions clearly.

#### Scenario: Running state appearance

- **GIVEN** a database tool container is running
- **WHEN** the button is rendered
- **THEN** the button has these visual properties:
  - Background: Blue (primary color, --color-primary-500)
  - Icon: `<Database />` (database icon from lucide-react)
  - Label: Tool name (e.g., "pgAdmin")
  - Cursor: Pointer (clickable)
  - Tooltip: "Open {tool} in new tab"

#### Scenario: Stopped state appearance

- **GIVEN** a database tool container is stopped
- **WHEN** the button is rendered
- **THEN** the button has these visual properties:
  - Background: Yellow/Amber (warning color, --color-warning-500)
  - Icon: `<PlayCircle />` (play icon from lucide-react)
  - Label: "Start {tool}" (e.g., "Start pgAdmin")
  - Cursor: Pointer (clickable)
  - Tooltip: "Click to start {tool} container"

#### Scenario: Starting state appearance

- **GIVEN** a database tool container is in the process of starting
- **WHEN** the button is rendered
- **THEN** the button has these visual properties:
  - Background: Blue (primary color, --color-primary-500)
  - Icon: `<Loader2 className="animate-spin" />` (spinner icon)
  - Label: "Starting {tool}..." (e.g., "Starting pgAdmin...")
  - Cursor: Not-allowed (disabled)
  - Disabled: true (cannot click)
  - Tooltip: "Container is starting, please wait..."

---

### Requirement: Status Polling

The DatabasePage component SHALL periodically poll container status to detect state changes (e.g., containers started/stopped externally via CLI) without requiring page refresh.

#### Scenario: Poll status every 30 seconds

- **GIVEN** the DatabasePage component is mounted
- **WHEN** the component initializes
- **THEN** a timer is set to fetch container status every 30 seconds
- **AND** the status is fetched immediately on mount (0 second delay)
- **AND** the timer continues polling until component unmounts
- **AND** the timer is cleared when component unmounts (no memory leak)

#### Scenario: Update button state on external change

- **GIVEN** the DatabasePage is displaying a "running" button for pgAdmin
- **AND** a user stops pgAdmin externally via CLI: `docker compose stop timescaledb-pgadmin`
- **WHEN** the next 30-second poll executes
- **THEN** the API returns `{ running: false }` for pgAdmin
- **AND** the button automatically transitions to "stopped" state (yellow, play icon, "Start pgAdmin")
- **AND** no iframe is loaded (user did not click button)

#### Scenario: Manual refresh on demand

- **GIVEN** the DatabasePage is displaying container status
- **WHEN** the user clicks a "Refresh Status" button (optional UI element)
- **THEN** the component immediately fetches current container status
- **AND** all button states update based on latest status
- **AND** the 30-second polling timer resets

---

### Requirement: Error Handling & User Feedback

The DatabasePage component SHALL handle errors gracefully and provide actionable feedback to users when container operations fail.

#### Scenario: Show toast notification on success

- **GIVEN** a user successfully starts a container
- **WHEN** the API returns `{ success: true }`
- **THEN** a success toast notification appears in the top-right corner
- **AND** the toast message is: "{Tool} started successfully!"
- **AND** the toast background is green (--color-success-500)
- **AND** the toast auto-dismisses after 3 seconds

#### Scenario: Show toast notification on error

- **GIVEN** a user attempts to start a container but it fails
- **WHEN** the API returns `{ success: false, error: 'Docker daemon not running' }`
- **THEN** an error toast notification appears
- **AND** the toast message is the error message from API
- **AND** the toast background is red (--color-error-500)
- **AND** the toast persists until user dismisses (does NOT auto-dismiss)
- **AND** the toast includes a "Show Details" button

#### Scenario: Display error modal with fallback

- **GIVEN** an error toast is displayed
- **WHEN** the user clicks "Show Details" on the toast
- **THEN** a modal opens with these sections:
  - **Title:** "Failed to Start {Tool}"
  - **Error Message:** Full error text from API
  - **Fallback Command:** Docker Compose CLI command (copyable)
  - **Actions:** "Copy Command" button, "Retry" button, "Close" button
- **AND** clicking "Copy Command" copies the CLI command to clipboard
- **AND** clicking "Retry" calls the start API again
- **AND** clicking "Close" dismisses the modal

---

### Requirement: Iframe Auto-Load on Success

The DatabasePage component SHALL automatically load the database tool in an iframe when the container transitions to "running" state after a successful start operation.

#### Scenario: Auto-load iframe after successful start

- **GIVEN** a user clicks "Start pgAdmin" button
- **AND** the container starts successfully
- **WHEN** the API returns `{ success: true, healthy: true }`
- **THEN** the component immediately updates state: `selectedTool = 'pgadmin'`
- **AND** the iframe renders with src="http://localhost:5050"
- **AND** the iframe displays the pgAdmin login page
- **AND** no additional user interaction is required

#### Scenario: Preserve existing behavior for running containers

- **GIVEN** a database tool container is already running
- **AND** the button shows "pgAdmin" (blue, database icon)
- **WHEN** the user clicks the "pgAdmin" button
- **THEN** the iframe loads immediately (existing behavior, no change)
- **AND** no API call to start the container is made
- **AND** the user experience is identical to before this feature

---

## Implementation Notes

### React Hooks

**useContainerStatus Hook:**
```typescript
interface UseContainerStatusResult {
  isRunning: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

function useContainerStatus(containerName: string): UseContainerStatusResult {
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch('http://localhost:3500/api/health/containers');
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      setIsRunning(data.containers?.[containerName]?.running || false);
      setError(null);
    } catch (err) {
      setError(err.message);
      setIsRunning(false); // Assume stopped on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [containerName]);

  return { isRunning, isLoading, error, refresh: fetchStatus };
}
```

**useStartContainer Hook:**
```typescript
interface UseStartContainerResult {
  startContainer: (name: string) => Promise<void>;
  isStarting: boolean;
  error: string | null;
}

function useStartContainer(): UseStartContainerResult {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startContainer = async (containerName: string) => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:3500/api/containers/${containerName}/start`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Start failed');
      }

      toast.success(`${containerName} started successfully!`);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsStarting(false);
    }
  };

  return { startContainer, isStarting, error };
}
```

### Button Component

**DatabaseToolButton Component:**
```tsx
interface DatabaseToolButtonProps {
  toolName: string;
  containerName: string;
  url: string;
  onLoad: (url: string) => void;
}

function DatabaseToolButton({ toolName, containerName, url, onLoad }: DatabaseToolButtonProps) {
  const { isRunning, isLoading } = useContainerStatus(containerName);
  const { startContainer, isStarting } = useStartContainer();

  const handleClick = async () => {
    if (!isRunning) {
      await startContainer(containerName);
      // Auto-load iframe after successful start
      onLoad(url);
    } else {
      // Existing behavior: load iframe immediately
      onLoad(url);
    }
  };

  const variant = isStarting ? 'disabled' : isRunning ? 'primary' : 'warning';
  const icon = isStarting ? <Loader2 className="animate-spin" /> :
               isRunning ? <Database /> : <PlayCircle />;
  const label = isStarting ? `Starting ${toolName}...` :
                isRunning ? toolName : `Start ${toolName}`;

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      disabled={isStarting || isLoading}
      className="min-w-[150px]"
    >
      {icon}
      <span className="ml-2">{label}</span>
    </Button>
  );
}
```

### Toast Notifications

Use existing toast library (e.g., `react-hot-toast` or `sonner`):

```tsx
import { toast } from 'sonner';

// Success
toast.success('pgAdmin started successfully!', {
  duration: 3000,
  position: 'top-right'
});

// Error
toast.error('Failed to start pgAdmin', {
  description: 'Docker daemon is not running',
  action: {
    label: 'Show Details',
    onClick: () => showErrorModal(error)
  },
  duration: Infinity // Persist until dismissed
});
```

### Validation Checklist

- [ ] Button states render correctly (running, stopped, starting)
- [ ] Container status polls every 30 seconds
- [ ] Start button calls API endpoint correctly
- [ ] Success toast displays on successful start
- [ ] Error toast displays on failure with details
- [ ] Iframe auto-loads after successful start
- [ ] Button is disabled during startup operation
- [ ] Error modal shows fallback CLI command
- [ ] Polling stops when component unmounts (no memory leak)
- [ ] All 4 database tools work (pgAdmin, pgWeb, Adminer, QuestDB)
