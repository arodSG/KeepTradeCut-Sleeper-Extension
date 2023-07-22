document.querySelectorAll("input[type='checkbox']").forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        chrome.storage.sync.set({ [e.target.id]: e.target.checked} );
    });
});

const restoreOptions = () => {
    chrome.storage.sync.get(
        { playerModalEnabled: true, matchupPlayersEnabled: true, teamPanelEnabled: true, trendPanelEnabled: true, tradesPanelEnabled: true, leagueChatEnabled: true },
        (items) => {
            document.getElementById('playerModalEnabled').checked = items.playerModalEnabled;
            document.getElementById('matchupPlayersEnabled').checked = items.matchupPlayersEnabled;
            document.getElementById('teamPanelEnabled').checked = items.teamPanelEnabled;
            document.getElementById('trendPanelEnabled').checked = items.trendPanelEnabled;
            document.getElementById('tradesPanelEnabled').checked = items.tradesPanelEnabled;
            document.getElementById('leagueChatEnabled').checked = items.leagueChatEnabled;
        }
    );
};

document.addEventListener('DOMContentLoaded', restoreOptions);