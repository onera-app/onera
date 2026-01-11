import { useUIStore } from '@/stores/uiStore';

export function SidebarSearch() {
  const { sidebarSearchQuery, setSidebarSearchQuery } = useUIStore();

  return (
    <div className="px-2 pb-2">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search chats..."
          value={sidebarSearchQuery}
          onChange={(e) => setSidebarSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm bg-sidebar-hover rounded-lg border-0 placeholder:text-gray-500 text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
        {sidebarSearchQuery && (
          <button
            onClick={() => setSidebarSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
