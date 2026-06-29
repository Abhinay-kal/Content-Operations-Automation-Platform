export function TopNav() {
    return (
        <header className="h-16 border-b bg-white flex items-center justify-between px-6">
            <div className="font-semibold text-gray-700">Dashboard Overview</div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Theme Toggle (Placeholder)</span>
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">U</div>
            </div>
        </header>
    );
}
