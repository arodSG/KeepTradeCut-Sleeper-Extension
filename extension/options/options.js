// Saves options to chrome.storage
const saveOptions = () => {
    const playerModalEnabled = document.getElementById('playerModalEnabled').checked;
    const matchupPlayersEnabled = document.getElementById('matchupPlayersEnabled').checked;
    const teamPanelEnabled = document.getElementById('teamPanelEnabled').checked;
    const trendPanelEnabled = document.getElementById('trendPanelEnabled').checked;
    const tradesPanelEnabled = document.getElementById('tradesPanelEnabled').checked;
    const leagueChatEnabled = document.getElementById('leagueChatEnabled').checked;

    chrome.storage.sync.set(
        { playerModalEnabled, matchupPlayersEnabled, teamPanelEnabled, trendPanelEnabled, tradesPanelEnabled, leagueChatEnabled },
        () => {
            // Update status to let user know options were saved.
            const status = document.getElementById('status');
            status.textContent = 'Options saved.';
            
            setTimeout(() => {
                status.textContent = '';
            }, 3000);
        }
    );
};

// Restores select box and checkbox state using the preferences stored in chrome.storage.
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
document.getElementById('save').addEventListener('click', saveOptions);