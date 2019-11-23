import React from 'react';
import ReactDOM from 'react-dom';
import TextareaAutosize from 'react-autosize-textarea';
import {TaskList} from './tasklists.js';
import { getRequest, postRequest } from '../utilities.js';
import { CustomAlert } from './customAlert.js';

function MiniList(props) {
    const [editing, setEditing] = React.useState(false);
    const [listName, setListName] = React.useState(props.list_name)
    const [isAdded, setIsAdded] = React.useState(false);

    React.useState(() => {
        if (props.list_id[0] == 't') {
            setIsAdded(false);
        } else {
            setIsAdded(true);
        }
    }, [])

    function changEditing() {
        setEditing(!editing)
    }

    function handleSave() {

    }

    if (editing) {
        return (
            React.createElement('div', {className: "miniListContainer"},
                React.createElement(TextareaAutosize, {className: "editMiniList", defaultValue: listName}),
                React.createElement('button', {className: "customButton", onClick: handleSave}, "Save"),
                React.createElement('button', {className: "customButton"}, "x")
            )
        )
    } else {
        return (
            React.createElement('div', {className: "miniListContainer"},
                (isAdded && React.createElement('div', {className: "miniList"}, listName)),
                (!isAdded && React.createElement('div', {className: "miniList adding"}, listName)),
                React.createElement('button', {className: "customButton", onClick: changEditing}, "Edit"),
                React.createElement('button', {className: "customButton"}, "x")
            )
        );
    }
}

function ListOfLists() {
    const [demoMode, setDemoMode] = React.useState(false);

    const [allListsName, setAllListsName] = React.useState("Loading");
    const [listToAdd, setListToAdd] = React.useState("");

    //This could be split up, but it shouldnt change, so its fine if its in a dictionary.
    //We only really need the user_id anyways.
    //I just might want to have a "{username}'s lists" title or something later.
    const [userData, setUserData] = React.useState({});
    const [adding, setAdding] = React.useState(false);

    //Asynchronous states
    const [allLists, setAllLists] = React.useState([]);
    const [deleteList, setDeleteList] = React.useState([]);
    const [currentTempId, setCurrentTempId] = React.useState(0);
    const [updateHappened, setUpdateHappened] = React.useState(false);

    //Asynchronous variables
    var tempAllLists = [];
    var tempDeleteList = [];
    var getting = false;
    //This one is here because state doesn't update immedietly and I want to use it in initialGetLists.
    var tempUserData = {};

    //Alert
    const [alertValue, setAlertValue] = React.useState("");
    const [displayAlert, setDisplayAlert] = React.useState(false);
    const [alertType, setAlertType] = React.useState("ok");

    //Get user data
    React.useEffect(() => {
        const getUserDataRequest = getRequest("users?token=" + localStorage.getItem("token"));
        getUserDataRequest.then(function(result) {
            tempUserData = result.d
            setUserData(tempUserData);
            
            initialGetLists();
        }).catch(function(errorData) {
            console.log(errorData)
            if (errorData.d.errors[0] == "not authenticated for this request") {
                setAlertType("yes/no");
                setAlertValue("You arent logged in. Continue in demo mode?");
                setDisplayAlert(true);
            }
        });
    }, []);

    React.useEffect(() => {
        tempAllLists = allLists;
        tempDeleteList = deleteList;
        if (updateHappened == true) {
            setUpdateHappened(false);
        }
    });

    //Gets the lists if the user was gotten
    function initialGetLists() {
        if (!getting) {
            getting = true;
            const getAllListsForUser = getRequest("tasklists?token=" + localStorage.getItem("token"));
            getAllListsForUser.then(function(result) {
                var username = tempUserData["user_name"];
                username = username[0].toUpperCase() + username.substring(1);
                setAllListsName(username + "'s lists");
                tempAllLists = result.d
                setAllLists(tempAllLists);
            }).catch(function(errorData) {
                listOfListsErrorHandler(errorData);
            });
        }
    }

    function renderAllLists() {
        var lists = allLists.map((list) => {
            return (React.createElement(MiniList, {key: list["list_id"],
                                                    list_id: list["list_id"],
                                                    list_name: list["list_name"]}));
        });
        return lists;
    }

    function listOfListsErrorHandler(errorData) {
        console.log(errorData);
    }

    function handleAlertButtons(buttonValue) {
        setDisplayAlert(false);
        if (alertType == "yes/no") {
            //Demo mode is currently the only yes/no type alert
            if(buttonValue) {
                setDemoMode(true);
                if (localStorage.getItem("allLists")) {
                    setAllLists(localStorage.getItem("allLists"));
                }
                setAllListsName("Demo mode");

                setAlertType("ok");
                setAlertValue("Now in demo mode. Do not use sensitive information in this mode. " + 
                                "Data is stored in your browser, so its not secure.");
                setDisplayAlert(true);
            } else {
                window.location.href = '/';
            }
        }
    }

    function toggleAdding() {
        setAdding(!adding);
    }

    function changeListToAdd(e) {
        e.preventDefault();
        setListToAdd(e.target.value);
    }

    function addList() {
        if (!listToAdd) {
            setAlertType("ok");
            setAlertValue("You cant add an empty list");
            setDisplayAlert(true);
            return;
        }
        
        if (demoMode) {
            setAllLists(allLists.push({list_id: currentTempId, list_name: listToAdd}));
            setListToAdd("");
            setCurrentTempId(currentTempId + 1);
        } else {
            var localTempId = currentTempId;
            tempAllLists.push({list_id: "temp" + localTempId, list_name: listToAdd});
            setAllLists(tempAllLists);

            const addListRequest = postRequest("tasklists", {"list_name": listToAdd,
                                                "token": localStorage.getItem("token")});
            addListRequest.then(function(result) {
                var index = tempAllLists.findIndex(i => i.list_id == "temp" + localTempId);
                tempAllLists[index]["list_id"] = result.d.list_id;
                
                if(tempAllLists[index]["canRetry"]) {
                    tempAllLists[index]["canRetry"] = false;
                }

                setAllLists(tempAllLists);
                setUpdateHappened(true);
            }).catch(function(errorData) {
                listOfListsErrorHandler(errorData);
                var index = tempAllLists.findIndex(i => i.list_id == "temp" + localTempId);
                tempAllLists[index]["canRetry"] = true;

                setAllLists(tempAllLists);
                setUpdateHappened(true);
            });
            
            setCurrentTempId(currentTempId + 1);
            setListToAdd("");
        }
    }

    return (
        React.createElement('div', {className: "listOfLists"},
            React.createElement('div', {className: "listOfListsName"}, allListsName),
            renderAllLists(),
            (!adding && React.createElement('div', {className: "wideButton", onClick: toggleAdding}, "Add list")),
            (adding && React.createElement('div', {className: "addListContainer"},
                React.createElement(TextareaAutosize, {className: "addList", rows: 1, type: "text",
                    onChange: changeListToAdd, value: listToAdd}),
                React.createElement('input',
                    {className: "customButton", type: "button", onClick: addList, value: "Add list"}
                ),
                React.createElement('button', {className: "customButton", onClick: toggleAdding}, "Done")
            )),
            (displayAlert && React.createElement(CustomAlert, {type: alertType, alert: alertValue, handleButtons: handleAlertButtons}))
        )
    );
}

ReactDOM.render(
    React.createElement(ListOfLists),
    document.getElementById('root')
);