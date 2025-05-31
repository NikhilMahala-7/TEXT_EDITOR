// This file is solely for storing the junk created during creating this project 
// The motive of this file is to store the junk so that one can view or implement the functions back 


    InsertInlineNode(type , styles = {} , pos) // for multiple types , we will think about it 
    {
        var NodeRear = this.FindNodeAtPos_Deep(pos - 1);
        var NodeCurrent = this.FindNodeAtPos_Deep(pos);


        if((NodeRear && NodeCurrent) && (NodeRear._id !== NodeCurrent._id)) 
        {
            console.log("running for the case 1")
            var ParentLevel_Rear = NodeRear.level - 1; 
            var Obj = NodeRear.ExtractRoots() ; 
            var SuitableParent = this.Search_By_Id(Obj["0"]) ; 
            for(let i = ParentLevel_Rear ; i > 0 ; i--)
            {
                var parent = this.Search_By_Id(Obj[`${i}`]);
                var bool = this.IsSuitable(type , styles , parent);
                if(bool)
                {
                    SuitableParent = parent ;
                    break  
                }
            }
            var indexo = SuitableParent.NodeBetween_Included(pos - 1,pos)[0].count
            var ET = new TextNode("a",0,"\u200B",pos)
            var Node = new InlineNode(SuitableParent._id , type , indexo + 1 , [ET] ,pos ,styles);
            SuitableParent.Childs.splice(indexo + 1 , 0 ,Node);
            this.resetPos()
            return ; 
        }


        if(!NodeCurrent && NodeRear) 
        {
            console.log("running for the case 2")
            var ParentLevel_Rear = NodeRear.level - 1; 
            var Obj = NodeRear.ExtractRoots() ; 
            var SuitableParent = this.Search_By_Id(Obj["0"]) ; 
            for(let i = ParentLevel_Rear ; i > 0 ; i--)
            {
                var parent = this.Search_By_Id(Obj[`${i}`]);
                var bool = this.IsSuitable(type , styles , parent);
                if(bool)
                {
                    SuitableParent = parent ;
                    break  
                }
            }
            var indexo = SuitableParent.NodeBetween_Included(pos - 1,pos)[0].count
            var ET = new TextNode("a",0,"\u200B",pos)
            var Node = new InlineNode(SuitableParent._id , type , indexo + 1 , [ET] ,pos ,styles);
            SuitableParent.Childs.splice(indexo + 1 , 0 ,Node);
            this.resetPos()
            return ;   
        }


        if(NodeCurrent && NodeRear && (NodeRear._id === NodeCurrent._id))
        {
            console.log("running for the case 3")
            var ParentLevel_Rear = NodeRear.level - 1; 
            var SuitableLevel  = 0 ; 
            var Obj = NodeRear.ExtractRoots() ; 
            var SuitableParent = this.Search_By_Id(Obj["0"]) ; 
            for(let i = ParentLevel_Rear ; i > 0 ; i--)
            {
                var parent = this.Search_By_Id(Obj[`${i}`]);
                var bool = this.IsSuitable(type , styles , parent);
                if(bool)
                {
                    SuitableLevel = i ; SuitableParent = parent ;
                    break  
                }
            }
            var indexo = null ; 
            for(let i = NodeRear.level ; i > SuitableLevel ;i--)
            {
                var CuttingNode = this.Search_By_Id(Obj[`${i}`]);
                var Peice = CuttingNode.Cut_Pos(pos)
                this.Search_By_Id(Obj[`${i - 1}`]).InsertCut(Peice)
                if(i === SuitableLevel + 1)
                {
                    indexo = CuttingNode.count + 1;
                }
            }
            var ET = new TextNode("a",0,"\u200B",pos)
            var Node = new InlineNode(SuitableParent._id , type , indexo  , [ET] ,pos ,styles);
            SuitableParent.Childs.splice(indexo , 0 ,Node);
            this.resetPos()
            return ;
        }

        // One case remains , that is the pos0 insertion 
    }









    IsSuitable(type , styles , Node)
    {
        if(Node.IncludeTypes.includes(type) && type !== "SP")
        {
            return false ;  
        }

        return Node.styles.IsSuitable(styles)
    }

    IsSuitableLayer(Array , Node , styles)
    {
        var NodeArr = Node.IncludeTypes ; 
        console.log("is suitalble layer running for : " , Node._id , "and arr is : " , NodeArr)
        if(NodeArr.length > Array.length )
        {
            if(Array.includes("SP"))
            {
                var Idx = Array.indexOf("SP");
                Array.splice(Idx , 1);
                Array.push("SP")
            }

            return {bool : false , arr : Array , _hasHope : true , _style : styles  , _case : 1}
        }
        else
        {
            if(Array.includes("SP"))
            {
                var Ox = Node.styles.IsSuitable(styles)
                if(Ox._bool)
                {
                        var newArr = [] ; 
                        for(let i = 0 ; i < Array.length ; i++)
                        {
                            if(!NodeArr.includes(Array[i]))
                            {
                                newArr.push(Array[i])
                            }
                        }
                        var isFalse = false ; 
                        for(let k = 0 ; k < NodeArr.length ; k++){if(!Array.includes(NodeArr[k])){isFalse = true ;}}
                        if(newArr.length === Array.length || isFalse)
                        {
                            return {bool : false , arr : Array , _hasHope : true , _style : styles , _case : 2 }
                        }
                        newArr.push("SP");
                        return {bool : true , arr : newArr , _style : Ox.newStyles , _case : 3}
                    
                }
                else
                {
                    var Idx = Array.indexOf("SP");
                    Array.splice(Idx , 1);
                    Array.push("SP")
                    return {bool : false , arr : Array , _hasHope : false ,_case : 4}
                }
            } 
            else
            {
                var newArr = [] ; 
                for(let i = 0 ; i < Array.length ; i++)
                {
                    if(!NodeArr.includes(Array[i]))
                    {
                        newArr.push(Array[i])
                    }
                }
                var isFalse = false ; 
                for(let k = 0 ; k < NodeArr.length ; k++){if(!Array.includes(NodeArr[k])){isFalse = true ;}}
                if(newArr.length === Array.length || isFalse)
                {
                    return {bool : false , arr : Array , _hasHope : true , _style : styles , _case : 5 }
                }
                else{return {bool : true , arr : newArr , _style : styles , _case : 6}}
            }
        }
    }







