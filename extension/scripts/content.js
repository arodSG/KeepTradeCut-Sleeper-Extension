// When window URL changes, call Sleeper API to get league info using league id from URL. Check if league is dynasty ("type":2) and if league is superflex ("roster_positions":[].includes('SUPER_FLEX')) to determine which values to use.

let playersJson = {};
let settings = {};
let leagueInfo = {};
let leagueId;
let observer;
let loadingPromises = [];

loadExtensionSettings();

document.addEventListener('readystatechange', e => {
    if(document.readyState === 'complete') {
        chrome.storage.session.get(['leagueInfo', 'json'], (storage) => {
            if(storage.json && storage.json.players) {
                const json = storage.json;
                playersJson = json.players;
                console.log('player info retrieved from session storage, last updated ' + json.lastUpdated);
            }
            else {
                getPlayersJson();
            }
            
            if(storage.leagueInfo) {
                leagueInfo = storage.leagueInfo;
            }
            
            getLeagueInfo();
            
            document.querySelectorAll('.nav-league-item-wrapper').forEach(leagueItemWrapper => {
                leagueItemWrapper.addEventListener('click', e => {
                    getLeagueInfo();
                });
            });
        });
    }
});

function getPlayersJson() {
    loadingPromises.push(fetch('https://arodsg.com/KTCValues/players.json', { cache: 'no-store' })
        .then(async function(response) {
            await response.json().then(json => {
                playersJson = json.players;
                chrome.storage.session.set({ json });
                console.log('player info retrieved from API, last updated ' + json.lastUpdated);
            });
        })
        .catch(error => {
            console.log(error);
        })
    );
}

function getLeagueIdFromUrl() {
    const windowUrl = window.location.href;
    const regex = /\/leagues\/(.*)\//
    const match = windowUrl.match(regex);
    return match && match.length > 1 ? match[1] : '';
}

function getLeagueInfo() {
    if(observer) {
        observer.disconnect();
    }
    
    setTimeout(() => {
        leagueId = getLeagueIdFromUrl();
        
        if(leagueId) {
            if(!leagueInfo.leagueId) {
                loadingPromises.push(
                    fetch(`https://api.sleeper.app/v1/league/${leagueId}`)
                        .then(async function(response) {
                            await response.json().then(json => {
                                leagueInfo[leagueId] = {
                                    isDynasty: json.settings.type === 2,
                                    isSuperflex: json.roster_positions.includes('SUPER_FLEX')
                                };
                                chrome.storage.session.set({ leagueInfo });
                            });
                        })
                        .catch(error => {
                            console.log(error);
                        })
                );
            }
        }
        
        Promise.all(loadingPromises).then(() => {
            loadingPromises = [];
            initHandlers();
        });
    }, 0);
}

function initHandlers() {
    const commentList = document.querySelector('.comment-list');
    
    handleTeamPanel();
    handleMatchupPlayers();
    if(commentList) {
        handleLeagueChat(commentList);
    }
    
    const callback = function(mutationsList) {
        for(var mutation of mutationsList) {
            if(mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if(node instanceof Element) {
                        if(settings.playerModalEnabled) {
                            const playerImageContainer = node.getElementsByClassName('player-image-container')[0];
                            const playerInfoContainer = node.getElementsByClassName('player-info-container')[0];

                            if(playerImageContainer && playerInfoContainer) {
                                handlePlayerModal();
                            }
                        }

                        if(settings.matchupPlayersEnabled) {
                            const matchupWrapperElement = node.getElementsByClassName('roster-matchup-tab-wrapper')[0];

                            if(matchupWrapperElement) {
                                handleMatchupPlayers();
                            }
                        }

                        if(settings.teamPanelEnabled) {
                            const teamPanel = node.getElementsByClassName('team-panel')[0] || null;
                            const weekSelectorDropdown = node.classList.contains('week-selector-dropdown');

                            if(teamPanel || weekSelectorDropdown) {
                                handleTeamPanel();
                            }
                        }

                        if(settings.trendPanelEnabled) {
                            const trendingListItem = node.classList.contains('trending-list-item');

                            if(trendingListItem) {
                                updateTrendingListItem(node);
                            }
                        }

                        if(settings.tradesPanelEnabled) {
                            const proposeTrade = node.classList.contains('select-trade-partners');
                            const addTradeAssets = node.classList.contains('add-trade-assets');
                            const reviewTradeOffer = node.classList.contains('review-trade-offer');
                            const tradeCenterWrapperElement = node.querySelector('.trade-center-wrapper');
                            const spacedRow = node.classList.contains('spaced-row');
                            const selectionCircle = node.classList.contains('selection-circle');

                            if(proposeTrade || addTradeAssets || tradeCenterWrapperElement) {
                                handleTradeModalButton();
                            }

                            if(spacedRow || selectionCircle || addTradeAssets || reviewTradeOffer || tradeCenterWrapperElement) {
                                updateTradeAssets();
                                updateTradeButtonLink();
                            }
                        }

                        if(settings.leagueChatEnabled) {
                            if(node.classList.contains('comment-list') || node.classList.contains('text-container') || node.classList.contains('comment-group')) {
                                handleLeagueChat(node);
                            }
                        }
                    }
                });
            }
            else if(mutation.type === 'attributes') {
                const node = mutation.target;

                if(settings.teamPanelEnabled && node.classList.contains('team-roster') && !node.classList.contains('loading')) {
                    handleTeamPanel();
                }

                if(settings.matchupPlayersEnabled) {
                    const matchupWrapperElement = node.getElementsByClassName('roster-matchup-tab-wrapper')[0];

                    if(matchupWrapperElement) {
                        handleMatchupPlayers();
                    }
                }
            }
        }
    };

    const observeNode = document.getElementById('root');
    const config = { attributes: true, childList: true, subtree: true };
    observer = new MutationObserver(callback);
    observer.observe(observeNode, config);
}

function loadExtensionSettings() {
    chrome.storage.sync.get(
        { playerModalEnabled: true, matchupPlayersEnabled: true, teamPanelEnabled: true, trendPanelEnabled: true, tradesPanelEnabled: true, leagueChatEnabled: true },
        (items) => {
            settings = items;
        }
    );
}

function handlePlayerModal() {
    const modalElement = document.getElementById('modal');
    const playerModalElement = modalElement ? modalElement.getElementsByClassName('players-news-modal')[0] : null;
    const playerCardElement = document.getElementsByClassName('player-card-content-container')[0] || null;

    if(playerCardElement) {
        const playerRankingRow = playerModalElement.querySelector('.player-ranking-row');
        const playerImageElement = playerCardElement.getElementsByClassName('player-image')[0] || null;
        const playerRankingRowElement = playerCardElement.getElementsByClassName('player-ranking-row')[0] || null;

        if(playerImageElement && playerRankingRowElement) {
            const playerImageUrl = playerImageElement.getAttribute('data');
            const playerId = playerImageUrl.substring(playerImageUrl.lastIndexOf('/') + 1, playerImageUrl.lastIndexOf('.'));
            
            const ktcValueRankItem = document.createElement('div');
            const ktcValueFlexContainer = document.createElement('div');
            const ktcValueTextContainer = document.createElement('div');
            const ktcValueRankLabel = document.createElement('div');

            ktcValueRankItem.classList.add('rank-item');
            ktcValueFlexContainer.setAttribute('style', 'flex-direction: row; align-items: flex-end;');
            ktcValueTextContainer.setAttribute('style', 'font-size: 22px; font-weight: 800; font-family: Muli; color: rgb(255, 255, 255); margin-left: 4px;');
            ktcValueTextContainer.textContent = getPlayerValue(playerId);
            ktcValueRankLabel.textContent = 'KTC VALUE';
            ktcValueRankLabel.classList.add('rank-label');

            if(playerId in playersJson) {
                const playerInfo = playersJson[playerId];

                ktcValueRankItem.style.cursor = 'pointer';
                ktcValueRankItem.onclick = function() {
                    const url = `https://keeptradecut.com/${leagueInfo[leagueId].isDynasty ? 'dynasty' : 'fantasy'}-rankings/players/${playerInfo.ktc_url}?format=${leagueInfo[leagueId].isSuperflex ? '2' : '1'}`;
                    window.open(url, '_blank');
                };
            }

            ktcValueFlexContainer.appendChild(ktcValueTextContainer);
            ktcValueRankItem.appendChild(ktcValueFlexContainer);
            ktcValueRankItem.appendChild(ktcValueRankLabel);
            playerRankingRow.appendChild(ktcValueRankItem);
        }
    }
}

function removeTeamPanelValues() {
    document.querySelectorAll('.team-panel-ktc-header').forEach(e => e.remove());
    document.querySelectorAll('.team-panel-ktc-value').forEach(e => e.remove());
}

function handleTeamPanel() {
    removeTeamPanelValues();
    
    const teamPanelElement = document.getElementsByClassName('team-panel')[0] || null;
    const teamRosterElement = teamPanelElement ? teamPanelElement.getElementsByClassName('team-roster')[0] : null;

    if(teamRosterElement) {
        const titleRowElement = teamRosterElement.getElementsByClassName('title-row')[0].getElementsByClassName('row')[0];
        const headerOptions = titleRowElement.getElementsByClassName('header-option');
        const lastTitleColumn = headerOptions.item(headerOptions.length - 1);

        const headerOption = document.createElement('div');
        headerOption.classList.add('team-panel-ktc-header');
        headerOption.classList.add('header-option');
        headerOption.textContent = 'KTC';
        titleRowElement.insertBefore(headerOption, lastTitleColumn);

        const teamRosterItems = teamRosterElement.getElementsByClassName('team-roster-item');

        for(teamRosterItem of teamRosterItems) {
            const itemOptionRow = teamRosterItem.querySelector(':scope > .row');

            if(itemOptionRow) {
                const itemOptions = itemOptionRow.getElementsByClassName('item-option');
                const lastItemOption = itemOptions.item(itemOptions.length - 1);
                const avatarPlayerElement = teamRosterItem.querySelector('.avatar-player');

                createTeamPanelKTCValue(itemOptionRow, avatarPlayerElement);
            }
        }
    }
}

function createTeamPanelKTCValue(itemOptionRow, avatarPlayerElement) {
    const playerId = getIdFromAvatarPlayer(avatarPlayerElement);
    const itemOptions = itemOptionRow.getElementsByClassName('item-option');
    const lastItemOption = itemOptions.item(itemOptions.length - 1);
    const newItemOption = document.createElement('div');
    const newItemFlexContainer = document.createElement('div');
    const newItemContainer = document.createElement('div');

    newItemOption.classList.add('team-panel-ktc-value');
    newItemOption.classList.add('item-option');
    newItemFlexContainer.setAttribute('style', 'flex-direction: row; align-items: flex-end;');
    newItemContainer.setAttribute('style', 'color: rgb(216, 226, 237); font-size: 12px;');
    newItemContainer.textContent = getPlayerValue(playerId);
    
    newItemFlexContainer.appendChild(newItemContainer);
    newItemOption.appendChild(newItemFlexContainer);
    itemOptionRow.insertBefore(newItemOption, lastItemOption);
}

function removeMatchupPlayerValues() {
    document.querySelectorAll('.ktc-value-container').forEach(e => e.remove());
}

function handleMatchupPlayers() {
    removeMatchupPlayerValues();
    
    const matchupWrapperElement = document.getElementsByClassName('roster-matchup-tab-wrapper')[0] || null;

    if(matchupWrapperElement) {
        const playerItems = matchupWrapperElement.getElementsByClassName('matchup-player-item') || [];

        for(playerItem of playerItems) {
            const playerContainer = playerItem.getElementsByClassName('container-row')[0] || null;

            if(playerContainer) {
                const scoreColumn = playerContainer.querySelector(':scope > .column');

                if(scoreColumn) {
                    const playerImageElement = playerItem.getElementsByClassName('player-image')[0] || null;
                    const playerImageUrl = playerImageElement.getAttribute('data');
                    const playerId = playerImageUrl.substring(playerImageUrl.lastIndexOf('/') + 1, playerImageUrl.lastIndexOf('.'));

                    const valueContainer = document.createElement('div');
                    valueContainer.classList.add('ktc-value-container');
                    valueContainer.setAttribute('style', 'font-size: 10px; color: #7988a1; margin-top: 8px;');
                    valueContainer.textContent = getPlayerValue(playerId);
                    scoreColumn.appendChild(valueContainer);
                }
            }
        }
    }
}

function getIdFromAvatarPlayer(avatarPlayerElement) {
    let playerId = '';
    
    if(avatarPlayerElement) {
        const playerIdLabel = avatarPlayerElement.getAttribute('aria-label').split(' ');
        playerId = playerIdLabel.length === 3 ? playerIdLabel[2] : '';
    }
    
    return playerId;
}

function handleTradeModalButton() {
    const proposeTradePartners = document.querySelector('.propose-trade-partners');
    const tradeCenterWrapper = document.querySelector('.trade-center-wrapper');
    
    if(proposeTradePartners) {
        const backButton = proposeTradePartners.querySelector('.back-button');
        const selectTradePartnersElement = document.querySelector('.select-trade-partners');
        const addTradeAssetsElement = document.querySelector('.add-trade-assets');
        const existingViewOnKTCButton = document.getElementById('viewOnKTCButton');
        
        if(addTradeAssetsElement && !existingViewOnKTCButton) {
            const viewOnKTCButton = document.createElement('div');
            viewOnKTCButton.setAttribute('id', 'viewOnKTCButton');
            viewOnKTCButton.classList.add('back-button');
            viewOnKTCButton.setAttribute('style', 'margin-left: 20px; margin-right: 20px; width: 270px;');
            viewOnKTCButton.textContent = 'VIEW ON KEEPTRADECUT';
            
            backButton.after(viewOnKTCButton);
            updateTradeButtonLink();
        }
        else if(selectTradePartnersElement && existingViewOnKTCButton) {
            existingViewOnKTCButton.remove();
        }
    }
    else if(tradeCenterWrapper) {
        const declineButton = tradeCenterWrapper.querySelector('.trade-button');
        const wrapperParent = tradeCenterWrapper.parentElement;
        wrapperParent.style.width = '630px';
        
        const viewOnKTCButton = document.createElement('div');
        viewOnKTCButton.setAttribute('id', 'viewOnKTCButton');
        viewOnKTCButton.classList.add('trade-button');
        viewOnKTCButton.classList.add('gray');
        viewOnKTCButton.classList.add('rounded');
        viewOnKTCButton.setAttribute('style', 'margin-left: 20px; margin-right: 20px; width: 220px; max-width: 220px;');
        viewOnKTCButton.textContent = 'VIEW ON KEEPTRADECUT';
        
        declineButton.after(viewOnKTCButton);
        updateTradeButtonLink();
    }
}

function updateTradeButtonLink() {
    const viewOnKTCButton = document.getElementById('viewOnKTCButton');
    
    if(viewOnKTCButton) {
        const rosterTradeSummaryElement = document.getElementsByClassName('roster-trade-summary')[0];
        const panelElements = rosterTradeSummaryElement.getElementsByClassName('panel');
        const receivePlayersPanel = panelElements[0];
        const receivePlayerAvatars = receivePlayersPanel.getElementsByClassName('avatar-player');
        const sendPlayersPanel = panelElements[1];
        const sendPlayerAvatars = sendPlayersPanel.getElementsByClassName('avatar-player');
        const receivePlayerIds = [];
        const sendPlayerIds = [];
        
        for(playerAvatar of receivePlayerAvatars) {
            const playerId = getIdFromAvatarPlayer(playerAvatar);
            
            if(playerId in playersJson) {
                const playerInfo = playersJson[playerId];
                receivePlayerIds.push(playerInfo.ktc_id);
            }
        }
        
        for(playerAvatar of sendPlayerAvatars) {
            const playerId = getIdFromAvatarPlayer(playerAvatar);
            
            if(playerId in playersJson) {
                const playerInfo = playersJson[playerId];
                sendPlayerIds.push(playerInfo.ktc_id);
            }
        }
        
        const ktcURL = `https://keeptradecut.com/trade-calculator?teamOne=${receivePlayerIds.join('|')}&teamTwo=${sendPlayerIds.join('|')}&format=${leagueInfo[leagueId].isSuperflex ? '2' : '1'}`;
        viewOnKTCButton.onclick = () => { window.open(ktcURL, '_blank') };
    }
}

function updateTradeAssets() {
    const tradeSummary = document.querySelector('.trade-summary');
    const assetRows = tradeSummary.querySelectorAll('.asset-row');
    
    assetRows.forEach(assetRow => {
        const playerAvatar = assetRow.querySelector('.avatar-player');
        const playerMetaText2 = assetRow.querySelector('.meta-text-2');
        const playerId = getIdFromAvatarPlayer(playerAvatar);
        let playerValue = getPlayerValue(playerId);
        let newMetaText = playerMetaText2.textContent;

        if(playerId in playersJson) {
            const playerInfo = playersJson[playerId];
            
            if(!playerInfo.meta_text) {
                playerInfo.meta_text = playerMetaText2.textContent + ' • ' + playerValue;
            }
            
            playerMetaText2.textContent = playerInfo.meta_text;
        }
        else {
            playerMetaText2.textContent = playerMetaText2.textContent + ' • ' + playerValue;
        }
    });
}

function updateTrendingListItem(trendingListItem) {
    const playerAvatar = trendingListItem.getElementsByClassName('avatar-player')[0];
    const playerId = getIdFromAvatarPlayer(playerAvatar);
    const parentElement = trendingListItem.getElementsByClassName('score')[0].parentElement;

    const ktcValueContainer = document.createElement('div');
    ktcValueContainer.setAttribute('style', 'font-size: 10px; font-weight: lighter; color: rgb(162, 187, 211); text-align: right;');
    ktcValueContainer.textContent = getPlayerValue(playerId);

    parentElement.append(ktcValueContainer);
}

function updateLeagueChatPlayer(playerContainer, textElementToUpdate) {
    if(playerContainer && textElementToUpdate) {
        const playerAvatar = playerContainer.querySelector('.avatar-player');
        const playerId = getIdFromAvatarPlayer(playerAvatar);
        const playerValue = getPlayerValue(playerId);
        textElementToUpdate.textContent += ` - ${playerValue}`;
    }
}

function getPlayerValue(playerId) {
    let playerValue;
    
    if(playerId in playersJson) {
        const playerInfo = playersJson[playerId];

        if(leagueInfo[leagueId].isDynasty) {
            playerValue = leagueInfo[leagueId].isSuperflex ? playerInfo.dynasty_superflex_value : playerInfo.dynasty_one_qb_value;
        }
        else {
            playerValue =  leagueInfo[leagueId].isSuperflex ? playerInfo.fantasy_superflex_value : playerInfo.fantasy_one_qb_value;
        }
    }
    
    return playerValue != null ? playerValue : 'N/A';
}

function handleChatPlayerInfo(playerInfoContainer) {
    updateLeagueChatPlayer(playerInfoContainer, playerInfoContainer.querySelector('.player-team'));
}

function handleChatTransactionPlayer(transactionPlayer) {
    updateLeagueChatPlayer(transactionPlayer, transactionPlayer.querySelector('.position'));
}

function handleChatNicknameChangePlayer(nicknameChangeItem) {
    updateLeagueChatPlayer(nicknameChangeItem, nicknameChangeItem.querySelector('.position'));
}

function handleChatWeeklyReportPlayer(weeklyReportPlayerItem) {
    updateLeagueChatPlayer(weeklyReportPlayerItem, weeklyReportPlayerItem.querySelector('.team-name'));
}

function handleLeagueChat(parentContainer) {
    const playerInfoContainers = parentContainer.querySelectorAll('.player-info-container');
    const transactionPlayers = parentContainer.querySelectorAll('.transaction-player');
    const nicknameChangePlayers = parentContainer.querySelectorAll('.nickname-change-item');
    const weeklyReportPlayers = parentContainer.querySelectorAll('.weekly-report-player-item');
    
    playerInfoContainers.forEach(playerContainer => { handleChatPlayerInfo(playerContainer) });
    transactionPlayers.forEach(playerContainer => { handleChatTransactionPlayer(playerContainer) });
    nicknameChangePlayers.forEach(playerContainer => { handleChatNicknameChangePlayer(playerContainer) });
    weeklyReportPlayers.forEach(playerContainer => { handleChatWeeklyReportPlayer(playerContainer) });
}