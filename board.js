class Node {
    constructor(parent, available_moves) {
        this.ri = 0;
        this.ni = 0;
        this.num_unexpand = available_moves.slice(0);
        this.parent = parent;
        this.children = {};
    }
}

class Game {
    constructor(board, available_moves) {
        // 0: free cell, 1: black, 2: white
        // Access the board cells: row * 19(number of columns) + column
        this.board = ((board == undefined)? [] : board.slice(0));
        this.available_moves = ((available_moves == undefined)? [] : available_moves.slice(0));
        this.height = 11;
        this.width = 11;
        this.terminal = 0;
        if(board == undefined){
            for(var i = 0; i < this.height; i++){
                for(var j = 0; j < this.width; j++){
                    this.board.push(0);
                }
            }
        }
        if(available_moves == undefined){
            for(var i = 0; i < this.height; i++){
                for(var j = 0; j < this.width; j++){
                    this.available_moves.push(i * this.height + j);
                }
            }
        }
    }

    is_terminal(position) {
        let row = Math.floor(position / this.height);
        let column = position % this.width;
        let vertical = 0, horizontal = 0, top_left = 0, top_right = 0;
        for(var y = row-1; y >= 0; y--){
            if(this.board[position] != this.board[y*this.height + column])
                break;
            else
                vertical++;
        }
        for(var y = row+1; y < this.height; y++){
            if(this.board[position] != this.board[y*this.height + column])
                break;
            else
                vertical++;
        }
        if(vertical >= 4){
            this.terminal = this.board[position];
            return this.board[position];
        }
    
        for(var x = column-1; x >= 0; x--){
            if(this.board[position] != this.board[row*this.height + x])
                break;
            else
                horizontal++;
        }
        for(var x = column+1; x < this.width; x++){
            if(this.board[position] != this.board[row*this.height + x])
                break;
            else
                horizontal++;
        }
        if(horizontal >= 4){
            this.terminal = this.board[position];
            return this.board[position];
        }

        x = column - 1;
        y = row - 1;
        while(x >= 0 && y >= 0){
            if(this.board[position] != this.board[y*this.height + x])
                break;
            else
                top_left++;
            x--;
            y--;
        }
        x = column + 1;
        y = row + 1;
        while(x < this.width && y < this.height){
            if(this.board[position] != this.board[y*this.height + x])
                break;
            else
                top_left++;
            x++;
            y++;
        }
        if(top_left >= 4){
            this.terminal = this.board[position];
            return this.board[position];
        }

        x = column + 1;
        y = row - 1;
        while(x < this.width && y >= 0){
            if(this.board[position] != this.board[y*this.height + x])
                break;
            else
                top_right++;
            x++;
            y--;
        }
        x = column - 1;
        y = row + 1;
        while(x >= 0 && y < this.height){
            if(this.board[position] != this.board[y*this.height + x])
                break;
            else
                top_right++;
            x--;
            y++;
        }
        if(top_right >= 4){
            this.terminal = this.board[position];
            return this.board[position];
        }

        this.terminal = 0;
        return 0;
    }

    step(position, player) {
        this.board[position] = player;
        this.available_moves = this.available_moves.filter(pos => pos !== position);
    }

    print_board() {
        for(var i = 0; i < this.height; i++){
            var row = []
            for(var j = 0; j < this.width; j++){
                row.push(this.board[i * this.width + j]);
            }
            console.log(row);
        }
    }

    is_valid_step(position) {
        return (position >= 0 && position < (this.width * this.height) && this.board[position] == 0);
    }

    get_height() {
        return this.height;
    }

    get_width() {
        return this.width;
    }

    clone() {
        return new Game(this.board, this.available_moves);
    }
}

class MCTS {
    constructor(num_sim, C, chess) {
        this.num_sim = ((num_sim == undefined)? 500 : num_sim);
        this.C = ((C == undefined)? 1.41 : C);
        this.N = 0;
        this.chess = ((chess == undefined)? 2 : chess);
    }   

    search(game, cur_root_node) {
        for(var itr = 0; itr < this.num_sim; itr++){
            let pack = this.select_and_expand(cur_root_node, game); // pack[0]: expanded node, pack[1]: game after expanding, pack[2]: player
            let result = this.simulate(pack[1], pack[2]);
            this.backprop(result, pack[0]);
        } 
        return parseInt(this.get_best_child(cur_root_node, false));
    }

    select_and_expand(node, game) {
        let clone_game = game.clone();
        this.N = node.ni;

        let player = true; // true: AI itself, false: human (its enemy)
        while(clone_game.available_moves.length > 0){//node.num_unexpand.length == 0){
            // expand
            if(node.num_unexpand.length != 0){
                let idx = Math.floor(Math.random() * node.num_unexpand.length);
                let position = node.num_unexpand[idx];
                if(player) clone_game.step(position, this.chess);
                else clone_game.step(position, 3 - this.chess);
                player = !player;
                let new_child = new Node(node, clone_game.available_moves);
                node.children['' + position] = new_child;
                node.num_unexpand = node.num_unexpand.filter(pos => pos !== position);
                clone_game.is_terminal(position);
                return [new_child, clone_game, player];
            }
            if(player){ // AI's turn
                let key = this.get_best_child(node, true);
                node = node.children[key];
                player = false;
                clone_game.step(parseInt(key), this.chess);
                if(clone_game.is_terminal(parseInt(key)))
                    return [node, clone_game, player];
            }
            else{ // human's turn
                let key = this.get_worse_child(node);
                node = node.children[key];
                player = true;
                clone_game.step(parseInt(key), 3 - this.chess);
                if(clone_game.is_terminal(parseInt(key)))
                    return [node, clone_game, player];
            }
        }
        return [node, clone_game, player];
    }

    simulate(expanded_game, player) {
        if(expanded_game.terminal == this.chess) { 
            // expanded_game.print_board(); 
            return 1;
        }
        else if(expanded_game.terminal == (3 - this.chess)) { 
            // expanded_game.print_board(); 
            return -1;
        }

        while(expanded_game.available_moves.length > 0){
            let idx = Math.floor(Math.random() * expanded_game.available_moves.length);
            let position = expanded_game.available_moves[idx];
            if(player){ // AI's turn
                expanded_game.step(position, this.chess);
                player = false;
            }
            else{ // human's turn
                expanded_game.step(position, 3 - this.chess);
                player = true;
            }

            let terminal = expanded_game.is_terminal(position);
            if(terminal == this.chess) { 
                // expanded_game.print_board();
                return 1;
            }
            else if(terminal == (3 - this.chess)) { 
                // expanded_game.print_board(); 
                return -1;
            }
        }
        return 0; // draw
    }

    backprop(result, expanded_node) {
        // this.N += 1;
        let node = expanded_node;
        while(node !== null){
            node.ri += result;
            node.ni += 1;
            node = node.parent;
        }
    }

    get_best_child(node, explore) {
        // return the key of the best child
        let max_key = "500";
        let max_ucb = -Infinity;
        for(let child_key in node.children){
            let child = node.children[child_key];
            let cur_ucb;
            if(explore) cur_ucb = (child.ri / child.ni) + this.C * Math.sqrt(((Math.log(this.N)) / child.ni));
            else cur_ucb = (child.ri / child.ni);
            if(cur_ucb > max_ucb){
                max_ucb = cur_ucb;
                max_key = child_key;
            }
        }
        return max_key;
    }

    get_worse_child(node) {
        // return the key of the worse child
        let min_key = "500";
        let min_ucb = Infinity;
        for(let child_key in node.children){
            let child = node.children[child_key];
            let cur_ucb = (child.ri / child.ni) + this.C * Math.sqrt(((Math.log(this.N)) / child.ni));
            if(cur_ucb < min_ucb){
                min_ucb = cur_ucb;
                min_key = child_key;
            }
        }
        return min_key;
    }
}

let player = 1;
let human_position = -1;
let cells = []; 
let game;
let mcts;
let toggle_color = false;
let interval;
let msg_box;

function initialize_board(){
    if(cells.length == (game.width * game.height)){
        for(let i = 0; i < (game.width * game.height); i++){
            cells[i].classList.remove("black");
            cells[i].classList.remove("white");
        }
        return;
    }

    let B = document.getElementById("board");
    for(let i = 0; i < game.height; i++){
        let row = document.createElement("div");
        row.classList.add("row");
        B.appendChild(row);
        for(let j = 0; j < game.width; j++){
            let cell = document.createElement("div");
            cell.addEventListener("click", function(e){
                    if(player == 2){
                        return -1;
                    }
                    // e.target.classList.add("black");
                    human_position = cells.indexOf(e.target);
                });
            cell.classList.add("cell");
            row.appendChild(cell);
            cells.push(cell);
        }
    }
}

function game_exe() {
    let row;
    let column;
    let position;
    if(player == 1){
        msg_box.innerHTML = "";
        msg_box.innerHTML = "Your turn";
        if(human_position == -1)
            return;
        else
            position = human_position;
    }
    else if(player == 2){
        msg_box.innerHTML = "";
        msg_box.innerHTML = "AI's turn 🤖";
        let node = new Node(null, game.available_moves);
        position = mcts.search(game, node);  
        if(mcts.C >= 1) mcts.C -= 0.1;
    }
    if(game.is_valid_step(position)){
        game.step(position, player);
        game.print_board();
        if(player == 1){
            player = 2;
            if(!toggle_color) cells[position].classList.add("black");
            else cells[position].classList.add("white");
            msg_box.innerHTML = "";
            msg_box.innerHTML = "AI's turn 🤖";
        }
        else{
            player = 1;
            if(!toggle_color) cells[position].classList.add("white");
            else cells[position].classList.add("black");
            human_position = -1;
            msg_box.innerHTML = "";
            msg_box.innerHTML = "Your turn";
        }
        if(game.is_terminal(position)){
            if(player == 2) {
                msg_box.innerHTML = "";
                msg_box.innerHTML = "You Win 🎉";
            }
            else if(player == 1) {
                msg_box.innerHTML = "";
                msg_box.innerHTML = "AI Wins 👁";
            }
            clearInterval(interval);
            return;
        }
    }
    else if(player == 1){
        // alert("Invalid move!");
    }
}

function play(turn){
    player = turn;
    msg_box = document.getElementById("msg-box");
    if(player == 1){
        toggle_color = false;
        msg_box.innerHTML = "";
        msg_box.innerHTML = "Your turn";
    }
    else{
        toggle_color = true;
        msg_box.innerHTML = "";
        msg_box.innerHTML = "AI's turn 🤖";
    }
    human_position = -1;
    clearInterval(interval);
    game = new Game();
    mcts = new MCTS(50000, 2, 2);
    initialize_board();
    interval = setInterval(game_exe, 50);
}

