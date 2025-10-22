let words = {};
let imposterHints = {}; // Store different hints for each imposter

// Enhanced player colors with more distinct and vibrant options
const playerColors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b',
    '#8e44ad', '#27ae60', '#f1c40f', '#e91e63', '#ff5722',
    '#795548', '#607d8b', '#3f51b5', '#009688', '#4caf50',
    '#ff9800', '#ffc107', '#cddc39', '#8bc34a', '#00bcd4',
    '#03a9f4', '#2196f3', '#673ab7', '#9c27b0', '#e91e63'
];

let playerColorAssignments = {}; // Store assigned colors for each player

let players = [];
let currentPlayerIndex = 0;
let fakerIndices = [];
let secretWord = '';
let hintWord = '';
let votes = {};
let currentRound = 1;
let totalRounds = 3;
let startingPlayerIndex = 0;
let playerWins = 0;
let fakerWins = 0;
let currentVotingPlayer = 0;
let individualVotes = {};

window.addEventListener('DOMContentLoaded', function() {
    loadWords();
    loadPlayers();
});

async function loadWords() {
    try {
        const response = await fetch('words.json');
        words = await response.json();
    } catch (error) {
        console.error('Error loading words:', error);
        // Fallback to basic words if JSON fails to load
        words = {
            animals: [{word: 'Dog', hints: ['Pet']}, {word: 'Cat', hints: ['Pet']}],
            food: [{word: 'Pizza', hints: ['Italian food']}, {word: 'Burger', hints: ['Fast food']}],
            places: [{word: 'Beach', hints: ['Water location']}, {word: 'Mountain', hints: ['High place']}],
            movies: [{word: 'Star Wars', hints: ['Space franchise']}, {word: 'Harry Potter', hints: ['Magic series']}],
            objects: [{word: 'Phone', hints: ['Communication device']}, {word: 'Lamp', hints: ['Light source']}],
            sports: [{word: 'Soccer', hints: ['Ball sport']}, {word: 'Basketball', hints: ['Hoop game']}]
        };
    }
}

function getPlayerColor(index) {
    return playerColors[index % playerColors.length];
}

function getPlayerColorClass(index) {
    return `player-color-${index % playerColors.length}`;
}

function assignRandomColorsToPlayers() {
    playerColorAssignments = {};
    const availableColors = [...playerColors]; // Create a copy to avoid modifying original array
    
    players.forEach((player, index) => {
        // Randomly select a color from available colors
        const randomIndex = Math.floor(Math.random() * availableColors.length);
        const selectedColor = availableColors.splice(randomIndex, 1)[0]; // Remove selected color
        playerColorAssignments[player] = selectedColor;
    });
}

function getPlayerAssignedColor(playerName) {
    return playerColorAssignments[playerName] || '#667eea'; // Default color if not found
}

function adjustColorBrightness(color, amount) {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Adjust brightness
    const newR = Math.max(0, Math.min(255, r + amount));
    const newG = Math.max(0, Math.min(255, g + amount));
    const newB = Math.max(0, Math.min(255, b + amount));
    
    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function loadPlayers() {
    const saved = localStorage.getItem('fakeItPlayers');
    if (saved) {
        try {
            players = JSON.parse(saved);
            updatePlayerList();
            updateStartingPlayerDropdown();
        } catch (e) {
            console.error('Error loading players:', e);
        }
    }
}

function savePlayers() {
    try {
        localStorage.setItem('fakeItPlayers', JSON.stringify(players));
    } catch (e) {
        console.error('Error saving players:', e);
    }
}

function addPlayer() {
    const input = document.getElementById('playerNameInput');
    const name = input.value.trim();
    
    if (name && !players.includes(name)) {
        players.push(name);
        input.value = '';
        savePlayers();
        updatePlayerList();
        updateStartingPlayerDropdown();
    }
}

function updatePlayerList() {
    const list = document.getElementById('playerList');
    const playersDiv = document.getElementById('players');
    
    if (players.length > 0) {
        list.style.display = 'block';
        playersDiv.innerHTML = players.map((p, i) => {
            // Use assigned color if available, otherwise use index-based color
            const playerColor = playerColorAssignments[p] || getPlayerColor(i);
            return `
                <div class="player-item" style="border-left-color: ${playerColor};">
                    <span>${p}</span>
                    <button class="remove-btn" onclick="removePlayer(${i})">Remove</button>
                </div>
            `;
        }).join('');
    } else {
        list.style.display = 'none';
    }
}

function updateStartingPlayerDropdown() {
    const dropdown = document.getElementById('startingPlayer');
    dropdown.innerHTML = '<option value="random">Random</option>' + 
        players.map((p, i) => `<option value="${i}">${p}</option>`).join('');
}

function removePlayer(index) {
    players.splice(index, 1);
    savePlayers();
    updatePlayerList();
    updateStartingPlayerDropdown();
}

function toggleMultiCategory() {
    const isMulti = document.getElementById('multiCategoryToggle').checked;
    document.getElementById('singleCategoryGroup').style.display = isMulti ? 'none' : 'block';
    document.getElementById('multiCategoryGroup').style.display = isMulti ? 'block' : 'none';
}

function startGame() {
    if (players.length < 3) {
        alert('You need at least 3 players to play!');
        return;
    }

    const imposterCount = parseInt(document.getElementById('imposterCount').value);
    if (imposterCount >= players.length) {
        alert('Number of imposters must be less than total players!');
        return;
    }

    const isMultiCategory = document.getElementById('multiCategoryToggle').checked;
    let categories = [];

    if (isMultiCategory) {
        const checkboxes = document.querySelectorAll('.category-checkboxes input[type="checkbox"]:checked');
        categories = Array.from(checkboxes).map(cb => cb.value);
        if (categories.length === 0) {
            alert('Please select at least one category!');
            return;
        }
    } else {
        categories = [document.getElementById('categorySelect').value];
    }

    const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
    const wordList = words[selectedCategory];
    const selectedWord = wordList[Math.floor(Math.random() * wordList.length)];
    secretWord = selectedWord.word;
    
    // Select fakers first
    fakerIndices = [];
    while (fakerIndices.length < imposterCount) {
        const randomIndex = Math.floor(Math.random() * players.length);
        if (!fakerIndices.includes(randomIndex)) {
            fakerIndices.push(randomIndex);
        }
    }
    
    // Assign random hints to imposters
    imposterHints = {};
    fakerIndices.forEach(fakerIndex => {
        const randomHint = selectedWord.hints[Math.floor(Math.random() * selectedWord.hints.length)];
        imposterHints[fakerIndex] = randomHint;
    });
    
    // For regular players, use the first hint
    hintWord = selectedWord.hints[0];

    const startingPlayerValue = document.getElementById('startingPlayer').value;
    if (startingPlayerValue === 'random') {
        startingPlayerIndex = Math.floor(Math.random() * players.length);
    } else {
        startingPlayerIndex = parseInt(startingPlayerValue);
    }

    totalRounds = parseInt(document.getElementById('roundCount').value);
    currentRound = 1;
    playerWins = 0;
    fakerWins = 0;

    // Assign random colors to all players
    assignRandomColorsToPlayers();

    currentPlayerIndex = 0;

    updateRoundDisplays();
    showScreen('role-screen');
    showPlayerRole();
}

function updateRoundDisplays() {
    document.getElementById('currentRoundDisplay').textContent = currentRound;
    document.getElementById('totalRoundsDisplay').textContent = totalRounds;
    document.getElementById('gameRoundDisplay').textContent = currentRound;
    document.getElementById('gameTotalRoundsDisplay').textContent = totalRounds;
    document.getElementById('resultsRoundDisplay').textContent = currentRound;
    document.getElementById('resultsTotalRoundsDisplay').textContent = totalRounds;
}

function showPlayerRole() {
    const playerName = document.getElementById('playerNameDisplay');
    const roleReveal = document.getElementById('roleReveal');
    const roleCard = document.getElementById('roleCard');
    const roleContent = document.getElementById('roleContent');
    const roleText = document.getElementById('roleText');
    const secretWordDiv = document.getElementById('secretWord');
    const hintWordDiv = document.getElementById('hintWord');
    
    const currentPlayer = players[currentPlayerIndex];
    playerName.textContent = currentPlayer;
    
    // Apply player's assigned color to the card
    const playerColor = getPlayerAssignedColor(currentPlayer);
    roleReveal.style.background = `linear-gradient(135deg, ${playerColor} 0%, ${adjustColorBrightness(playerColor, -20)} 100%)`;
    
    // Reset card to front (unflipped state)
    roleCard.classList.remove('flipped');
    roleContent.classList.add('hidden');
    
    // Set up the role content but keep it hidden
    if (fakerIndices.includes(currentPlayerIndex)) {
        roleReveal.classList.add('faker-reveal');
        roleText.textContent = 'You are an IMPOSTER!';
        secretWordDiv.textContent = '❓';
        // Show the specific hint assigned to this imposter
        const imposterHint = imposterHints[currentPlayerIndex] || hintWord;
        hintWordDiv.textContent = `Hint: ${imposterHint}`;
        hintWordDiv.style.display = 'block';
    } else {
        roleReveal.classList.remove('faker-reveal');
        roleText.textContent = 'The secret word is:';
        secretWordDiv.textContent = secretWord;
        hintWordDiv.style.display = 'none';
    }
    
    // Add click event listener to the card
    roleCard.onclick = function() {
        if (!roleCard.classList.contains('flipped')) {
            revealRole();
        }
    };
}

function revealRole() {
    const roleCard = document.getElementById('roleCard');
    const roleContent = document.getElementById('roleContent');
    
    // Flip the card to reveal the role
    roleCard.classList.add('flipped');
    roleContent.classList.remove('hidden');
}

function nextPlayer() {
    currentPlayerIndex++;
    
    if (currentPlayerIndex < players.length) {
        showPlayerRole();
    } else {
        document.getElementById('startingPlayerName').textContent = players[startingPlayerIndex];
        document.getElementById('imposterCountDisplay').textContent = fakerIndices.length;
        document.getElementById('startPlayerReminder').textContent = players[startingPlayerIndex];
        showScreen('game-screen');
    }
}

function startVoting() {
    currentVotingPlayer = 0;
    individualVotes = {};
    showIndividualVoting();
}

function showIndividualVoting() {
    const votingScreen = document.querySelector('.voting-screen');
    const currentPlayer = players[currentVotingPlayer];
    
    votingScreen.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 20px;">${currentPlayer}'s Turn to Vote</h2>
        <p style="text-align: center; margin-bottom: 20px; color: #666;">Who do you think is the faker?</p>
        <div class="voting-grid" id="votingGrid"></div>
        <button onclick="nextVoter()" id="nextVoterBtn" style="display: none;">Next Voter</button>
        <button onclick="showResults()" id="showResultsBtn" style="display: none;">Show Results</button>
    `;
    
    const grid = document.getElementById('votingGrid');
    grid.innerHTML = players.map((p, i) => {
        const playerColor = getPlayerAssignedColor(p);
        return `<button class="vote-btn" style="border-color: ${playerColor}; color: ${playerColor};" onclick="individualVote(${i})">${p}</button>`;
    }).join('');
    
    showScreen('voting-screen');
}

function individualVote(index) {
    const buttons = document.querySelectorAll('.vote-btn');
    const clickedButton = buttons[index];
    const votedPlayer = players[index];
    const currentPlayer = players[currentVotingPlayer];
    
    // Clear previous selection
    buttons.forEach(btn => btn.classList.remove('selected'));
    
    // Select the clicked button
    clickedButton.classList.add('selected');
    
    // Store the vote
    individualVotes[currentPlayer] = votedPlayer;
    
    // Show next button or results button
    const nextVoterBtn = document.getElementById('nextVoterBtn');
    const showResultsBtn = document.getElementById('showResultsBtn');
    
    if (currentVotingPlayer < players.length - 1) {
        nextVoterBtn.style.display = 'block';
    } else {
        showResultsBtn.style.display = 'block';
    }
}

function nextVoter() {
    currentVotingPlayer++;
    showIndividualVoting();
}

function vote(index) {
    const buttons = document.querySelectorAll('.vote-btn');
    const clickedButton = buttons[index];
    
    clickedButton.classList.toggle('selected');
    
    const playerName = players[index];
    if (clickedButton.classList.contains('selected')) {
        votes[playerName] = (votes[playerName] || 0) + 1;
    } else {
        votes[playerName] = (votes[playerName] || 1) - 1;
        if (votes[playerName] <= 0) {
            delete votes[playerName];
        }
    }
}

function showResults() {
    // Convert individual votes to vote counts
    votes = {};
    for (let voter in individualVotes) {
        const votedPlayer = individualVotes[voter];
        votes[votedPlayer] = (votes[votedPlayer] || 0) + 1;
    }

    const voteResults = document.getElementById('voteResults');
    const winnerDisplay = document.getElementById('winnerDisplay');
    const finalWord = document.getElementById('finalWord');
    const finalHint = document.getElementById('finalHint');
    const imposterList = document.getElementById('imposterList');

    let resultsHTML = '';
    let maxVotes = 0;
    let mostVoted = [];

    for (let player in votes) {
        const playerColor = getPlayerAssignedColor(player);
        resultsHTML += `
            <div class="vote-count" style="border-left-color: ${playerColor};">
                <span>${player}</span>
                <span>${votes[player]} vote(s)</span>
            </div>
        `;
        if (votes[player] > maxVotes) {
            maxVotes = votes[player];
            mostVoted = [player];
        } else if (votes[player] === maxVotes && maxVotes > 0) {
            mostVoted.push(player);
        }
    }

    if (Object.keys(votes).length === 0) {
        resultsHTML = '<p style="text-align: center; color: #666;">No votes were cast!</p>';
    }

    voteResults.innerHTML = resultsHTML;

    // Determine if players won or fakers won
    const fakerNames = fakerIndices.map(i => players[i]);
    let playersWon = false;

    if (mostVoted.length > 0) {
        // Check if any of the most voted are fakers
        const votedOutFaker = mostVoted.some(name => fakerNames.includes(name));
        
        if (votedOutFaker && mostVoted.length === 1) {
            playersWon = true;
            playerWins++;
            winnerDisplay.innerHTML = `
                <div class="winner">
                    🎉 Players Win! 🎉<br>
                    You correctly identified the imposter!
                </div>
            `;
        } else if (votedOutFaker && mostVoted.length > 1) {
            winnerDisplay.innerHTML = `
                <div class="winner" style="background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);">
                    🤝 It's a Tie! 🤝<br>
                    Multiple players tied with most votes
                </div>
            `;
        } else {
            fakerWins++;
            winnerDisplay.innerHTML = `
                <div class="winner" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
                    😈 Imposters Win! 😈<br>
                    The imposters fooled everyone!
                </div>
            `;
        }
    } else {
        fakerWins++;
        winnerDisplay.innerHTML = `
            <div class="winner" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
                😈 Imposters Win! 😈<br>
                No one was voted out!
            </div>
        `;
    }

    finalWord.textContent = secretWord;
    finalHint.textContent = hintWord;

    // Show the imposter list box
    imposterList.innerHTML = fakerNames.map((name, idx) => {
        const playerColor = getPlayerAssignedColor(name);
        return `
            <div class="vote-count" style="border-left-color: ${playerColor};">
                <span>${name}</span>
                <span>🎭</span>
            </div>
        `;
    }).join('');

    // Display scoreboard
    const scoresDiv = document.getElementById('scores');
    scoresDiv.innerHTML = `
        <div class="vote-count" style="border-left-color: #28a745;">
            <span>👥 Players</span>
            <span>${playerWins} win(s)</span>
        </div>
        <div class="vote-count" style="border-left-color: #dc3545;">
            <span>🎭 Imposters</span>
            <span>${fakerWins} win(s)</span>
        </div>
    `;

    // Update button text
    const nextRoundBtn = document.getElementById('nextRoundBtn');
    if (currentRound >= totalRounds) {
        nextRoundBtn.textContent = 'Game Complete!';
        nextRoundBtn.style.display = 'none';
    } else {
        nextRoundBtn.textContent = 'Next Round';
        nextRoundBtn.style.display = 'block';
    }

    showScreen('results-screen');
}

function nextRound() {
    if (currentRound >= totalRounds) {
        return;
    }

    currentRound++;
    
    // Select new word
    const isMultiCategory = document.getElementById('multiCategoryToggle').checked;
    let categories = [];

    if (isMultiCategory) {
        const checkboxes = document.querySelectorAll('.category-checkboxes input[type="checkbox"]:checked');
        categories = Array.from(checkboxes).map(cb => cb.value);
    } else {
        categories = [document.getElementById('categorySelect').value];
    }

    const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
    const wordList = words[selectedCategory];
    const selectedWord = wordList[Math.floor(Math.random() * wordList.length)];
    secretWord = selectedWord.word;
    
    // Select new fakers
    const imposterCount = parseInt(document.getElementById('imposterCount').value);
    fakerIndices = [];
    while (fakerIndices.length < imposterCount) {
        const randomIndex = Math.floor(Math.random() * players.length);
        if (!fakerIndices.includes(randomIndex)) {
            fakerIndices.push(randomIndex);
        }
    }
    
    // Assign random hints to imposters
    imposterHints = {};
    fakerIndices.forEach(fakerIndex => {
        const randomHint = selectedWord.hints[Math.floor(Math.random() * selectedWord.hints.length)];
        imposterHints[fakerIndex] = randomHint;
    });
    
    // For regular players, use the first hint
    hintWord = selectedWord.hints[0];

    // Randomize starting player for new round
    startingPlayerIndex = Math.floor(Math.random() * players.length);

    currentPlayerIndex = 0;
    votes = {};

    updateRoundDisplays();
    showScreen('role-screen');
    showPlayerRole();
}

function resetGame() {
    currentRound = 1;
    playerWins = 0;
    fakerWins = 0;
    currentPlayerIndex = 0;
    votes = {};
    showScreen('setup-screen');
}

function showScreen(screenName) {
    document.querySelectorAll('.setup-screen, .role-screen, .game-screen, .voting-screen, .results-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.querySelector(`.${screenName}`).classList.add('active');
}

// Allow Enter key to add player
document.addEventListener('DOMContentLoaded', function() {
    const playerNameInput = document.getElementById('playerNameInput');
    if (playerNameInput) {
        playerNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addPlayer();
            }
        });
    }
});
